'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { api } from '@/lib/api/client';
import { createMutationQueue, type MutationQueue, type QueuedMutation, type QueueStorage } from '@/lib/edit/queue';
import { createCompletionStore } from './completion';
import type { TripView } from './content';

type Progress = { stops: ReadonlySet<string>; items: ReadonlySet<string>; ready: boolean };
const EMPTY: Progress = { stops: new Set(), items: new Set(), ready: false };
type LocalStore = ReturnType<typeof createCompletionStore>;
type Session = { userId: string; store: LocalStore; queue: MutationQueue; allowed: boolean; unsubscribe?: () => void };
type Claim = { version: 1; userId: string; stops: string[]; items: string[]; done: boolean };

function browserStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function validClaim(value: unknown): value is Claim {
  if (typeof value !== 'object' || value === null) return false;
  const claim = value as Record<string, unknown>;
  return (
    claim.version === 1 &&
    typeof claim.userId === 'string' &&
    claim.userId.length > 0 &&
    typeof claim.done === 'boolean' &&
    Array.isArray(claim.stops) &&
    claim.stops.every((key) => typeof key === 'string') &&
    Array.isArray(claim.items) &&
    claim.items.every((key) => typeof key === 'string')
  );
}

/** Uses the existing local store for serialization and checklist toggles. */
function replaceStops(store: LocalStore, desired: Set<string>) {
  const current = new Set(store.getSnapshot().stops);
  for (const key of current) if (!desired.has(key)) store.toggleStop(key);
  for (const key of desired) if (!current.has(key)) store.toggleStop(key);
}

function createTripProgress(trip: TripView) {
  const storage = browserStorage();
  const queueStorage: QueueStorage = {
    getItem(key) {
      if (!storage) throw new Error('Storage unavailable');
      return storage.getItem(key);
    },
    setItem(key, value) {
      if (!storage) throw new Error('Storage unavailable');
      storage.setItem(key, value);
    },
  };
  const guest = createCompletionStore(trip.slug, storage);
  // These sessions live only for this hook instance; no account state is global.
  const sessions = new Map<string, Session>();
  const stops = trip.days.flatMap((day) => day.stops);
  const byKey = new Map(stops.map((stop) => [stop.key, stop.id]));
  const byId = new Map(stops.map((stop) => [stop.id, stop.key]));
  const claimKey = `tripnote:completion-import:v1:${encodeURIComponent(trip.id)}`;
  const listeners = new Set<() => void>();
  let snapshot = EMPTY;
  let alive = false;
  let generation = 0;
  let currentUserId: string | null = null;
  let active: Session | null = null;
  let visible: 'checking' | 'guest' | 'member' = 'checking';
  let unsubscribeGuest: (() => void) | undefined;

  function publish() {
    const store = visible === 'guest' ? guest : visible === 'member' ? active?.store : undefined;
    snapshot = store
      ? { stops: new Set(store.getSnapshot().stops), items: new Set(store.getSnapshot().items), ready: true }
      : EMPTY;
    for (const listener of listeners) listener();
  }

  function current(token: number) {
    return alive && token === generation;
  }

  async function identify() {
    const token = ++generation;
    currentUserId = null;
    visible = 'checking';
    publish();
    try {
      const result = await api.GET('/api/v1/me');
      if (!current(token)) return null;
      if (result.response.status === 401) {
        active = null;
        visible = 'guest';
        publish();
        return { userId: null, token };
      }
      if (!result.data || typeof result.data.id !== 'string' || !result.data.id) return null;
      currentUserId = result.data.id;
      return { userId: result.data.id, token };
    } catch {
      // An unverified identity cannot reveal or replay any previous user's cache.
      return null;
    }
  }

  function operationValue(operation: QueuedMutation) {
    const { stopId, completed } = operation.payload;
    if (
      operation.type !== 'completion.set' ||
      typeof stopId !== 'string' ||
      typeof completed !== 'boolean' ||
      !byId.has(stopId)
    )
      return null;
    return { stopId, completed };
  }

  function overlay(session: Session, baseline: Iterable<string>) {
    const desired = new Set(baseline);
    for (const operation of session.queue.getSnapshot().operations) {
      const value = operationValue(operation);
      const key = value && byId.get(value.stopId);
      if (!key || !value) continue;
      if (value.completed) desired.add(key);
      else desired.delete(key);
    }
    replaceStops(session.store, desired);
  }

  function migrate(session: Session): boolean {
    if (!storage) return false;
    try {
      const raw = storage.getItem(claimKey);
      let claim: Claim;
      if (raw === null) {
        const original = guest.getSnapshot();
        claim = {
          version: 1,
          userId: session.userId,
          stops: [...original.stops],
          items: [...original.items],
          done: false,
        };
        // Claim even an empty guest snapshot, so later guest checks cannot be
        // silently copied into another account on this shared browser.
        storage.setItem(claimKey, JSON.stringify(claim));
      } else {
        const saved: unknown = JSON.parse(raw);
        if (!validClaim(saved)) return true;
        claim = saved;
      }
      if (claim.userId !== session.userId || claim.done) return true;
      for (const key of claim.stops) {
        const stopId = byKey.get(key);
        if (!stopId || session.store.getSnapshot().stops.includes(key)) continue;
        const alreadyQueued = session.queue.getSnapshot().operations.some((operation) => {
          const value = operationValue(operation);
          return value?.stopId === stopId;
        });
        if (!alreadyQueued) session.queue.enqueue('completion.set', { stopId, completed: true });
      }
      const desired = new Set([...session.store.getSnapshot().stops, ...claim.stops.filter((key) => byKey.has(key))]);
      // A user may have unchecked a migrated stop while the claim write was
      // blocked. The latest queued intent wins over the original guest import.
      overlay(session, desired);
      for (const item of claim.items) {
        if (!session.store.getSnapshot().items.includes(item)) session.store.toggleItem(item);
      }
      if (session.queue.getSnapshot().status === 'storage-error') return false;
      storage.setItem(claimKey, JSON.stringify({ ...claim, done: true }));
      return true;
    } catch {
      // Preserve the original guest snapshot and claim on every storage failure.
      return false;
    }
  }

  function watch(session: Session) {
    session.unsubscribe = session.store.subscribe(() => {
      if (alive && active === session && visible === 'member') publish();
    });
  }

  function sessionFor(userId: string): Session {
    const existing = sessions.get(userId);
    if (existing) return existing;
    const store = createCompletionStore(`member:${encodeURIComponent(userId)}:${encodeURIComponent(trip.id)}`, storage);
    const queue = createMutationQueue({
      userId,
      // Completion operations have their own namespace, separate from editor drafts.
      tripId: `completion:${trip.id}`,
      storage: queueStorage,
      getCurrentUserId: () => (alive ? currentUserId : null),
      transport: async (operation) => {
        const value = operationValue(operation);
        if (!value) return { status: 409 };
        const identity = await identify();
        if (!identity) return { status: 401 };
        if (identity.userId !== userId) {
          if (identity.userId) await loadMember(identity.userId, identity.token);
          return { status: 401 };
        }
        const session = sessions.get(userId);
        if (!session || !current(identity.token)) return { status: 401 };
        active = session;
        visible = 'member';
        publish();
        const params = { path: { tripId: trip.id, stopId: value.stopId } };
        const result = value.completed
          ? await api.PUT('/api/v1/trips/{tripId}/completions/stops/{stopId}', { params })
          : await api.DELETE('/api/v1/trips/{tripId}/completions/stops/{stopId}', { params });
        if (result.response.status === 403 || result.response.status === 404) session.allowed = false;
        if (result.response.status === 401 && current(identity.token)) {
          currentUserId = null;
          visible = 'checking';
          publish();
        }
        return { status: result.response.status };
      },
    });
    const session: Session = { userId, store, queue, allowed: false };
    sessions.set(userId, session);
    if (alive) watch(session);
    return session;
  }

  async function resume(session: Session) {
    if (!session.allowed || !alive || currentUserId !== session.userId || active !== session) return;
    await session.queue.retry();
    // A focus lookup may have superseded an in-flight /me verification. Once
    // it has stopped, resume only the account verified by the newer lookup.
    if (
      alive &&
      active === session &&
      currentUserId === session.userId &&
      session.allowed &&
      session.queue.getSnapshot().status === 'auth'
    ) {
      await session.queue.retry();
    }
  }

  async function loadMember(userId: string, token: number) {
    const session = sessionFor(userId);
    active = session;
    session.allowed = false;
    try {
      const result = await api.GET('/api/v1/trips/{tripId}/completions', { params: { path: { tripId: trip.id } } });
      if (!current(token)) return;
      if (result.response.status === 401) {
        currentUserId = null;
        return;
      }
      if (result.response.ok && Array.isArray(result.data) && result.data.every((id) => typeof id === 'string')) {
        overlay(
          session,
          result.data.flatMap((id) => byId.get(id) ?? []),
        );
        // Persist recovered in-memory edits before finishing their migration
        // claim, while keeping transport stopped until the claim is durable.
        await session.queue.retry({ flush: false });
        if (!current(token)) return;
        // A completed durable claim must precede sending any imported checks.
        session.allowed = migrate(session);
      } else {
        overlay(session, session.store.getSnapshot().stops);
      }
    } catch {
      if (!current(token)) return;
      overlay(session, session.store.getSnapshot().stops);
    }
    if (!current(token)) return;
    visible = 'member';
    publish();
    await resume(session);
  }

  async function refresh() {
    const identity = await identify();
    if (identity?.userId) await loadMember(identity.userId, identity.token);
  }

  const onRefresh = () => {
    void refresh();
  };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    start() {
      alive = true;
      unsubscribeGuest = guest.subscribe(() => {
        if (visible === 'guest') publish();
      });
      for (const session of sessions.values()) watch(session);
      globalThis.addEventListener('focus', onRefresh);
      globalThis.addEventListener('online', onRefresh);
      onRefresh();
      return () => {
        alive = false;
        generation++;
        currentUserId = null;
        unsubscribeGuest?.();
        for (const session of sessions.values()) session.unsubscribe?.();
        globalThis.removeEventListener('focus', onRefresh);
        globalThis.removeEventListener('online', onRefresh);
      };
    },
    toggleStop(key: string) {
      if (visible === 'guest') {
        guest.toggleStop(key);
        return;
      }
      if (visible !== 'member' || !active || currentUserId !== active.userId) return;
      const session = active;
      const stopId = byKey.get(key);
      if (!stopId) return;
      const completed = !session.store.getSnapshot().stops.includes(key);
      try {
        session.queue.enqueue('completion.set', { stopId, completed });
      } catch {
        // Storage can be blocked; keep a local draft without claiming server sync.
      }
      session.store.toggleStop(key);
      if (session.allowed) void session.queue.flush();
    },
    toggleItem(key: string) {
      if (visible === 'guest') guest.toggleItem(key);
      else if (visible === 'member' && active && currentUserId === active.userId) active.store.toggleItem(key);
    },
  };
}

/** Stop progress syncs for the verified account; checklist progress stays scoped locally. */
export function useTripCompletion(trip: TripView) {
  const progress = useMemo(() => createTripProgress(trip), [trip]);
  const snapshot = useSyncExternalStore(progress.subscribe, progress.getSnapshot, () => EMPTY);
  useEffect(() => progress.start(), [progress]);
  return useMemo(
    () => ({ ...snapshot, toggleStop: progress.toggleStop, toggleItem: progress.toggleItem }),
    [snapshot, progress],
  );
}
