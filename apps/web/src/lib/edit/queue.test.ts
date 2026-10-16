import { describe, expect, it } from 'vitest';
import { createMutationQueue, type QueuedMutation, type QueueStorage } from './queue';

class MemoryStorage implements QueueStorage {
  data = new Map<string, string>();
  failRead = false;
  failWrite = false;
  getItem(key: string) {
    if (this.failRead) throw new Error('Storage unavailable');
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failWrite) throw new Error('Storage full');
    this.data.set(key, value);
  }
}

function setup(storage = new MemoryStorage()) {
  let activeUser: string | null = 'alice';
  let sequence = 0;
  const sent: QueuedMutation[] = [];
  const options = {
    userId: 'alice',
    tripId: 'trip-1',
    storage,
    getCurrentUserId: () => activeUser,
    createId: () => `mutation-${++sequence}`,
    now: () => 123,
    transport: async (operation: QueuedMutation) => {
      sent.push(operation);
      return { status: 200 };
    },
  };
  return {
    storage,
    options,
    sent,
    setUser: (user: string | null) => {
      activeUser = user;
    },
  };
}

describe('durable mutation queue', () => {
  it('reuses a persisted operation ID after a committed response is lost and the page reloads', async () => {
    const state = setup();
    const server = new Map<string, string>();
    const received: string[] = [];
    let loseResponse = true;
    const transport = async (operation: QueuedMutation) => {
      received.push(operation.id);
      if (!server.has(operation.id)) server.set(operation.id, 'created-stop');
      if (loseResponse) throw new TypeError('Connection lost after commit');
      return { status: 201 };
    };
    const queue = createMutationQueue({ ...state.options, transport });
    const operation = queue.enqueue('stop.create', { title: 'Lunch', dayId: 'day-1' });
    await queue.flush();
    expect(queue.getSnapshot().status).toBe('offline');
    expect(queue.getSnapshot().operations).toEqual([operation]);

    const reloaded = createMutationQueue({ ...state.options, transport });
    expect(reloaded.getSnapshot().operations[0]?.payload).toEqual({ title: 'Lunch', dayId: 'day-1' });
    loseResponse = false;
    await reloaded.retry();
    expect(received).toEqual(['mutation-1', 'mutation-1']);
    expect(server.size).toBe(1);
    expect(reloaded.getSnapshot().operations).toEqual([]);
    expect(createMutationQueue(state.options).getSnapshot().operations).toEqual([]);
  });

  it('serializes concurrent flushes and includes operations enqueued while sending', async () => {
    const state = setup();
    let release: () => void = () => {};
    const firstResponse = new Promise<void>((resolve) => {
      release = resolve;
    });
    const received: string[] = [];
    const queue = createMutationQueue({
      ...state.options,
      transport: async (operation) => {
        received.push(operation.type);
        if (operation.type === 'first') await firstResponse;
        return { status: 200 };
      },
    });
    queue.enqueue('first', { title: 'A' });
    queue.enqueue('second', { title: 'B' });
    const flush = queue.flush();
    const duplicateFlush = queue.flush();
    queue.enqueue('third', { title: 'C' });
    expect(received).toEqual(['first']);
    release();
    await Promise.all([flush, duplicateFlush]);
    expect(received).toEqual(['first', 'second', 'third']);
    expect(queue.getSnapshot().status).toBe('idle');
  });

  it.each([401, 403, 409])(
    'persists a %i pause and preserves dependent drafts until explicit retry',
    async (status) => {
      const state = setup();
      const expectedStatus = status === 409 ? 'conflict' : 'auth';
      const queue = createMutationQueue({
        ...state.options,
        transport: async (operation) => {
          state.sent.push(operation);
          return { status };
        },
      });
      const first = queue.enqueue('trip.update', { title: 'Draft', version: 3 });
      const second = queue.enqueue('day.update', { theme: 'Draft day' });
      await queue.flush();
      expect(state.sent.map((operation) => operation.id)).toEqual([first.id]);
      expect(queue.getSnapshot().status).toBe(expectedStatus);
      expect(queue.getSnapshot().operations).toEqual([first, second]);
      const reloaded = createMutationQueue(state.options);
      await reloaded.flush();
      expect(state.sent).toHaveLength(1);
      expect(reloaded.getSnapshot().status).toBe(expectedStatus);
      await reloaded.retry();
      expect(reloaded.getSnapshot().operations).toEqual([]);
      expect(state.sent.map((operation) => operation.id)).toEqual([first.id, first.id, second.id]);
    },
  );

  it('never sends the previous account queue and pauses if the account changes during a send', async () => {
    const state = setup();
    const queue = createMutationQueue({
      ...state.options,
      transport: async (operation) => {
        state.sent.push(operation);
        state.setUser('bob');
        return { status: 200 };
      },
    });
    queue.enqueue('first', { title: 'Alice' });
    queue.enqueue('second', { title: 'Alice again' });
    state.setUser('bob');
    await queue.flush();
    expect(state.sent).toEqual([]);
    state.setUser('alice');
    await queue.retry();
    expect(state.sent.map((operation) => operation.type)).toEqual(['first']);
    expect(queue.getSnapshot().operations.map((operation) => operation.type)).toEqual(['second']);
    expect(queue.getSnapshot().status).toBe('auth');
    const bob = createMutationQueue({ ...state.options, userId: 'bob' });
    await bob.flush();
    expect(bob.getSnapshot().operations).toEqual([]);
    expect(state.sent).toHaveLength(1);
  });

  it('keeps separately persisted queues for different trips and users', () => {
    const state = setup();
    createMutationQueue(state.options).enqueue('first', { title: 'Alice trip 1' });
    createMutationQueue({ ...state.options, tripId: 'trip-2' }).enqueue('second', { title: 'Alice trip 2' });
    createMutationQueue({ ...state.options, userId: 'bob' }).enqueue('third', { title: 'Bob trip 1' });
    expect(state.storage.data.size).toBe(3);
    expect(
      createMutationQueue(state.options)
        .getSnapshot()
        .operations.map((operation) => operation.type),
    ).toEqual(['first']);
  });

  it('rechecks the account immediately before transport when a syncing subscriber logs out', async () => {
    const state = setup();
    const queue = createMutationQueue(state.options);
    queue.enqueue('first', { title: 'Alice draft' });
    queue.subscribe(() => {
      if (queue.getSnapshot().status === 'syncing') state.setUser(null);
    });
    await queue.flush();
    expect(state.sent).toEqual([]);
    expect(queue.getSnapshot().status).toBe('auth');
    expect(queue.getSnapshot().operations[0]?.payload).toEqual({ title: 'Alice draft' });
  });

  it('blocks replay until a failed draft write can be persisted', async () => {
    const state = setup();
    const queue = createMutationQueue(state.options);
    state.storage.failWrite = true;
    const operation = queue.enqueue('stop.create', { title: 'Unsaved draft' });
    expect(queue.getSnapshot().status).toBe('storage-error');
    expect(queue.getSnapshot().operations).toEqual([operation]);
    await queue.flush();
    expect(state.sent).toEqual([]);
    state.storage.failWrite = false;
    await queue.retry();
    expect(state.sent.map((operation) => operation.payload)).toEqual([{ title: 'Unsaved draft' }]);
    expect(queue.getSnapshot().operations).toEqual([]);
  });

  it('retains the acknowledged operation if persisting its removal fails', async () => {
    const state = setup();
    const queue = createMutationQueue({
      ...state.options,
      transport: async (operation) => {
        state.sent.push(operation);
        state.storage.failWrite = true;
        return { status: 200 };
      },
    });
    const operation = queue.enqueue('stop.create', { title: 'Keep ID' });
    await queue.flush();
    expect(queue.getSnapshot().status).toBe('storage-error');
    expect(queue.getSnapshot().operations).toEqual([operation]);
    expect(createMutationQueue(state.options).getSnapshot().operations[0]?.id).toBe(operation.id);
  });

  it('fails closed on unreadable storage and can recover without overwriting stored drafts', async () => {
    const state = setup();
    createMutationQueue(state.options).enqueue('first', { title: 'Stored' });
    state.storage.failRead = true;
    const queue = createMutationQueue(state.options);
    expect(queue.getSnapshot().status).toBe('storage-error');
    expect(() => queue.enqueue('second', { title: 'New' })).toThrow();
    await queue.flush();
    expect(state.sent).toEqual([]);
    state.storage.failRead = false;
    await queue.retry();
    expect(state.sent.map((operation) => operation.payload)).toEqual([{ title: 'Stored' }]);
  });

  it.each([
    '{broken',
    'null',
    '{"version":2,"operations":[]}',
    '{"version":1,"userId":"alice","tripId":"trip-1","pause":null,"operations":[null]}',
    '{"version":1,"userId":"alice","tripId":"trip-1","pause":null,"operations":[{"id":"a","userId":"bob","tripId":"trip-1","type":"first","payload":{},"createdAt":1}]}',
    '{"version":1,"userId":"alice","tripId":"trip-1","pause":null,"operations":[{"id":"a","userId":"alice","tripId":"trip-1","type":"first","payload":[],"createdAt":1}]}',
  ])('never sends or overwrites corrupt or foreign persisted operations: %s', async (raw) => {
    const state = setup();
    createMutationQueue(state.options).enqueue('first', { title: 'Key fixture' });
    const key = [...state.storage.data.keys()][0];
    if (!key) throw new Error('Expected persisted key');
    state.storage.data.set(key, raw);
    const queue = createMutationQueue(state.options);
    await queue.flush();
    await queue.retry();
    expect(queue.getSnapshot().status).toBe('storage-error');
    expect(state.sent).toEqual([]);
    expect(() => queue.enqueue('second', { title: 'New' })).toThrow();
    expect(state.storage.data.get(key)).toBe(raw);
  });

  it('rejects malformed payloads before writing and isolates stored drafts from caller mutation', () => {
    const state = setup();
    const queue = createMutationQueue(state.options);
    expect(() => queue.enqueue('bad', { invalid: Number.NaN })).toThrow();
    expect(() => queue.enqueue('', { title: 'Invalid type' })).toThrow();
    expect(state.storage.data.size).toBe(0);
    const payload = { nested: { title: 'Original' } };
    queue.enqueue('first', payload);
    payload.nested.title = 'Changed outside queue';
    expect(queue.getSnapshot().operations[0]?.payload).toEqual({ nested: { title: 'Original' } });
  });

  it('retains non-success HTTP responses and requires explicit retry', async () => {
    const state = setup();
    const queue = createMutationQueue({ ...state.options, transport: async () => ({ status: 500 }) });
    queue.enqueue('first', { title: 'Retry later' });
    await queue.flush();
    expect(queue.getSnapshot().status).toBe('offline');
    expect(queue.getSnapshot().operations).toHaveLength(1);
  });

  it('explicitly discards a conflicted operation while preserving subsequent drafts', async () => {
    const state = setup();
    const queue = createMutationQueue({ ...state.options, transport: async () => ({ status: 409 }) });
    const operation = queue.enqueue('first', { title: 'Conflicting' });
    const dependent = queue.enqueue('second', { title: 'Keep draft' });
    await queue.flush();
    queue.discard(operation.id);
    expect(queue.getSnapshot().operations).toEqual([dependent]);
    expect(queue.getSnapshot().status).toBe('conflict');
    expect(createMutationQueue(state.options).getSnapshot().operations).toEqual([dependent]);
  });

  it('keeps stable immutable snapshots and notifies subscribers only until unsubscribe', async () => {
    const state = setup();
    const queue = createMutationQueue(state.options);
    const initial = queue.getSnapshot();
    expect(queue.getSnapshot()).toBe(initial);
    const statuses: string[] = [];
    const unsubscribe = queue.subscribe(() => statuses.push(queue.getSnapshot().status));
    queue.enqueue('first', { title: 'Draft' });
    expect(queue.getSnapshot()).not.toBe(initial);
    expect(Object.isFrozen(queue.getSnapshot().operations[0]?.payload)).toBe(true);
    unsubscribe();
    await queue.flush();
    expect(statuses).toEqual(['idle']);
  });

  it('fails closed when a stale instance tries to overwrite another instance draft', async () => {
    const state = setup();
    const firstTab = createMutationQueue(state.options);
    const staleTab = createMutationQueue(state.options);
    firstTab.enqueue('first', { title: 'First tab draft' });
    const original = [...state.storage.data.values()][0];
    const secondDraft = staleTab.enqueue('second', { title: 'Stale tab draft' });
    expect(staleTab.getSnapshot().status).toBe('storage-error');
    expect(staleTab.getSnapshot().operations).toEqual([secondDraft]);
    expect([...state.storage.data.values()][0]).toBe(original);
    await staleTab.flush();
    await staleTab.retry();
    expect(state.sent).toEqual([]);
    expect([...state.storage.data.values()][0]).toBe(original);
    expect(createMutationQueue(state.options).getSnapshot().operations[0]?.type).toBe('first');
  });

  it('does not remove another instance draft when saving an in-flight acknowledgement', async () => {
    const state = setup();
    let release: () => void = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const firstTab = createMutationQueue({
      ...state.options,
      transport: async () => {
        await pending;
        return { status: 200 };
      },
    });
    const firstDraft = firstTab.enqueue('first', { title: 'Being sent' });
    const flush = firstTab.flush();
    const otherTab = createMutationQueue(state.options);
    const otherDraft = otherTab.enqueue('second', { title: 'New in other tab' });
    const external = [...state.storage.data.values()][0];
    release();
    await flush;
    expect(firstTab.getSnapshot().status).toBe('storage-error');
    expect(firstTab.getSnapshot().operations).toEqual([firstDraft]);
    expect([...state.storage.data.values()][0]).toBe(external);
    expect(createMutationQueue(state.options).getSnapshot().operations).toEqual([firstDraft, otherDraft]);
  });

  it('can durably resume a failed draft write without sending until the caller finishes its prerequisite', async () => {
    const state = setup();
    const queue = createMutationQueue(state.options);
    state.storage.failWrite = true;
    queue.enqueue('first', { title: 'Wait for migration claim' });
    state.storage.failWrite = false;
    await queue.retry({ flush: false });
    expect(state.sent).toEqual([]);
    expect(queue.getSnapshot().status).toBe('idle');
    expect(createMutationQueue(state.options).getSnapshot().operations[0]?.payload).toEqual({
      title: 'Wait for migration claim',
    });
    await queue.flush();
    expect(state.sent.map((operation) => operation.type)).toEqual(['first']);
  });
});
