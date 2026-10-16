export type JsonValue = string | number | boolean | null | JsonValue[] | JsonRecord;
export type JsonRecord = { [key: string]: JsonValue };

export interface QueuedMutation {
  readonly id: string;
  readonly userId: string;
  readonly tripId: string;
  readonly type: string;
  readonly payload: JsonRecord;
  readonly createdAt: number;
}

export type QueueStatus = 'idle' | 'syncing' | 'offline' | 'auth' | 'conflict' | 'storage-error';

export interface QueueSnapshot {
  readonly operations: readonly QueuedMutation[];
  readonly status: QueueStatus;
  readonly error: string | null;
}

export interface QueueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface MutationQueueOptions {
  userId: string;
  tripId: string;
  storage: QueueStorage;
  getCurrentUserId: () => string | null;
  transport: (operation: QueuedMutation) => Promise<{ status: number }>;
  createId?: () => string;
  now?: () => number;
}

type Pause = 'offline' | 'auth' | 'conflict' | null;

interface StoredQueue {
  version: 1;
  userId: string;
  tripId: string;
  operations: QueuedMutation[];
  pause: Pause;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isJson(value: unknown, ancestors = new Set<object>(), depth = 0): value is JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (depth > 64 || typeof value !== 'object' || ancestors.has(value)) return false;
  if (!Array.isArray(value) && !isRecord(value)) return false;
  ancestors.add(value);
  const valid = Object.values(value).every((child) => isJson(child, ancestors, depth + 1));
  ancestors.delete(value);
  return valid;
}

function nonempty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function validOperation(value: unknown, userId: string, tripId: string): value is QueuedMutation {
  return (
    isRecord(value) &&
    nonempty(value.id) &&
    value.userId === userId &&
    value.tripId === tripId &&
    nonempty(value.type) &&
    isRecord(value.payload) &&
    isJson(value.payload) &&
    typeof value.createdAt === 'number' &&
    Number.isFinite(value.createdAt) &&
    value.createdAt >= 0
  );
}

function freezeJson(value: JsonValue): void {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freezeJson(child);
    Object.freeze(value);
  }
}

function freezeOperation(operation: QueuedMutation): QueuedMutation {
  freezeJson(operation.payload);
  return Object.freeze(operation);
}

/**
 * One queue instance owns one user/trip pair. Keep the current account getter live;
 * transport must preserve operation.id as the server's idempotency key. No send
 * starts until its draft has been saved. A failed write retains the in-memory
 * draft, but cannot survive a page close until retry successfully persists it.
 */
export function createMutationQueue(options: MutationQueueOptions) {
  const { userId, tripId, storage } = options;
  if (!nonempty(userId) || !nonempty(tripId)) throw new Error('Queue scope is required');
  const key = `tripnote:edit-queue:v1:${encodeURIComponent(userId)}:${encodeURIComponent(tripId)}`;
  const listeners = new Set<() => void>();
  let snapshot: QueueSnapshot = Object.freeze({ operations: Object.freeze([]), status: 'idle', error: null });
  let pause: Pause = null;
  let loaded = false;
  let lastStored: string | null = null;
  let flushing = false;
  let activeFlush: Promise<void> | null = null;
  let inFlightId: string | null = null;

  function publish(operations: readonly QueuedMutation[], status: QueueStatus, error: string | null = null) {
    snapshot = Object.freeze({ operations: Object.freeze([...operations]), status, error });
    for (const listener of listeners) {
      try {
        listener();
      } catch {
        // Consumer rendering errors must not interrupt durable queue transitions.
      }
    }
  }

  function write(operations: readonly QueuedMutation[], nextPause: Pause) {
    // localStorage has no compare-and-swap. Detect stale sequential writers
    // before every mutation instead of silently replacing another tab's drafts.
    if (storage.getItem(key) !== lastStored) throw new Error('Queue changed in another instance');
    const stored: StoredQueue = { version: 1, userId, tripId, operations: [...operations], pause: nextPause };
    const serialized = JSON.stringify(stored);
    storage.setItem(key, serialized);
    lastStored = serialized;
  }

  function load(): boolean {
    try {
      const raw = storage.getItem(key);
      if (raw === null) {
        pause = null;
        lastStored = null;
        loaded = true;
        publish([], 'idle');
        return true;
      }
      const stored: unknown = JSON.parse(raw);
      if (
        !isRecord(stored) ||
        stored.version !== 1 ||
        stored.userId !== userId ||
        stored.tripId !== tripId ||
        !Array.isArray(stored.operations) ||
        ![null, 'offline', 'auth', 'conflict'].includes(stored.pause as Pause) ||
        !stored.operations.every((operation) => validOperation(operation, userId, tripId)) ||
        new Set(stored.operations.map((operation: QueuedMutation) => operation.id)).size !== stored.operations.length
      ) {
        throw new Error('Invalid stored queue');
      }
      // Reconstruct the known envelope fields; never pass arbitrary stored fields to transport.
      const operations = stored.operations.map((operation: QueuedMutation) =>
        freezeOperation({
          id: operation.id,
          userId,
          tripId,
          type: operation.type,
          payload: operation.payload,
          createdAt: operation.createdAt,
        }),
      );
      pause = stored.pause as Pause;
      lastStored = raw;
      loaded = true;
      publish(operations, pause ?? 'idle');
      return true;
    } catch {
      publish(snapshot.operations, 'storage-error', '저장된 변경사항을 읽을 수 없어요.');
      return false;
    }
  }

  function stop(nextPause: Exclude<Pause, null>, error: string) {
    pause = nextPause;
    try {
      write(snapshot.operations, pause);
      publish(snapshot.operations, pause, error);
    } catch {
      publish(snapshot.operations, 'storage-error', '변경사항을 저장할 수 없어요.');
    }
  }

  async function drain() {
    while (snapshot.operations.length > 0) {
      if (options.getCurrentUserId() !== userId) {
        stop('auth', '변경한 계정으로 다시 로그인해 주세요.');
        return;
      }
      const operation = snapshot.operations[0];
      if (!operation) return;
      inFlightId = operation.id;
      publish(snapshot.operations, 'syncing');
      if (options.getCurrentUserId() !== userId) {
        inFlightId = null;
        stop('auth', '변경한 계정으로 다시 로그인해 주세요.');
        return;
      }
      let status: number;
      try {
        status = (await options.transport(operation)).status;
      } catch {
        inFlightId = null;
        stop('offline', '연결을 확인한 후 다시 시도해 주세요.');
        return;
      }
      inFlightId = null;
      // Enqueuing during transport may have failed to persist. Retain the
      // acknowledged operation as well, so retry uses the same idempotency ID.
      if (snapshot.status === 'storage-error') return;
      if (status === 401 || status === 403) {
        stop('auth', '로그인 상태와 수정 권한을 확인해 주세요.');
        return;
      }
      if (status === 409) {
        stop('conflict', '다른 변경사항이 있어요. 작성한 내용을 확인해 주세요.');
        return;
      }
      if (!Number.isInteger(status) || status < 200 || status >= 300) {
        stop('offline', '변경사항을 전송하지 못했어요. 다시 시도해 주세요.');
        return;
      }
      const remaining = snapshot.operations.filter((item) => item.id !== operation.id);
      try {
        write(remaining, null);
      } catch {
        publish(snapshot.operations, 'storage-error', '전송 결과를 저장할 수 없어요.');
        return;
      }
      publish(remaining, remaining.length > 0 ? 'syncing' : 'idle');
    }
  }

  function flush(): Promise<void> {
    if (flushing) return activeFlush ?? Promise.resolve();
    if (!loaded || snapshot.status !== 'idle' || snapshot.operations.length === 0) return Promise.resolve();
    flushing = true;
    activeFlush = drain().finally(() => {
      flushing = false;
      activeFlush = null;
    });
    return activeFlush;
  }

  load();

  return {
    enqueue(type: string, payload: JsonRecord): QueuedMutation {
      if (!loaded) throw new Error('Stored queue must be recovered before adding edits');
      if (!nonempty(type) || !isRecord(payload) || !isJson(payload)) throw new Error('Invalid mutation payload');
      const operation: QueuedMutation = {
        id: options.createId?.() ?? globalThis.crypto.randomUUID(),
        userId,
        tripId,
        type,
        payload: JSON.parse(JSON.stringify(payload)) as JsonRecord,
        createdAt: options.now?.() ?? Date.now(),
      };
      if (!validOperation(operation, userId, tripId) || snapshot.operations.some((item) => item.id === operation.id)) {
        throw new Error('Invalid or duplicate mutation ID');
      }
      freezeOperation(operation);
      const operations = [...snapshot.operations, operation];
      try {
        write(operations, pause);
        publish(operations, snapshot.status);
      } catch {
        publish(operations, 'storage-error', '변경사항을 저장할 수 없어요.');
      }
      return operation;
    },
    flush,
    async retry(retryOptions: { flush?: boolean } = {}) {
      if (flushing) return activeFlush;
      if (!loaded && !load()) return;
      if (options.getCurrentUserId() !== userId) {
        stop('auth', '변경한 계정으로 다시 로그인해 주세요.');
        return;
      }
      try {
        write(snapshot.operations, null);
      } catch {
        publish(snapshot.operations, 'storage-error', '변경사항을 저장할 수 없어요.');
        return;
      }
      pause = null;
      publish(snapshot.operations, 'idle');
      if (retryOptions.flush !== false) await flush();
    },
    discard(operationId: string) {
      if (!loaded) throw new Error('Stored queue must be recovered before discarding edits');
      if (operationId === inFlightId) throw new Error('Cannot discard a mutation while it is sending');
      const operations = snapshot.operations.filter((operation) => operation.id !== operationId);
      if (operations.length === snapshot.operations.length) return;
      try {
        write(operations, pause);
        publish(operations, snapshot.status);
      } catch {
        publish(snapshot.operations, 'storage-error', '변경사항을 저장할 수 없어요.');
      }
    },
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type MutationQueue = ReturnType<typeof createMutationQueue>;
