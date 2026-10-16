'use client';

import { useMemo, useSyncExternalStore } from 'react';

type Snapshot = { stops: string[]; items: string[] };
const EMPTY: Snapshot = Object.freeze({ stops: [], items: [] }) as Snapshot;
const PREFIX = 'tripnote:completion:v1:';

const strings = (v: unknown) => (Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : []);

export function createCompletionStore(slug: string, storage: Storage | undefined = globalThis.localStorage) {
  const key = `${PREFIX}${slug}`;
  const listeners = new Set<() => void>();
  let snapshot: Snapshot = load();

  function load(): Snapshot {
    try {
      const saved = JSON.parse(storage?.getItem(key) ?? 'null');
      return { stops: strings(saved?.stops), items: strings(saved?.items) };
    } catch {
      return { stops: [], items: [] };
    }
  }

  function commit(next: Snapshot) {
    snapshot = next;
    try {
      storage?.setItem(key, JSON.stringify(next));
    } catch {
      // 사생활 보호 모드나 저장 공간 부족이면 이번 방문 동안만 기억한다.
    }
    for (const listener of listeners) listener();
  }

  const toggle = (values: string[], value: string) =>
    values.includes(value) ? values.filter((v) => v !== value) : [...values, value];

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      const onStorage = (event: StorageEvent) => {
        if (event.key === key) {
          snapshot = load();
          listener();
        }
      };
      globalThis.addEventListener?.('storage', onStorage);
      return () => {
        listeners.delete(listener);
        globalThis.removeEventListener?.('storage', onStorage);
      };
    },
    toggleStop: (stopKey: string) => commit({ ...snapshot, stops: toggle(snapshot.stops, stopKey) }),
    toggleItem: (itemId: string) => commit({ ...snapshot, items: toggle(snapshot.items, itemId) }),
  };
}

const stores = new Map<string, ReturnType<typeof createCompletionStore>>();

/** 테스트마다 localStorage를 비우므로, 메모리에 남은 저장소도 같이 비운다. */
export function resetCompletionStores() {
  stores.clear();
}

function storeFor(slug: string) {
  let store = stores.get(slug);
  if (!store) {
    store = createCompletionStore(slug);
    stores.set(slug, store);
  }
  return store;
}

export function useCompletion(slug: string) {
  const store = storeFor(slug);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, () => EMPTY);
  return useMemo(
    () => ({
      stops: new Set(snapshot.stops) as ReadonlySet<string>,
      items: new Set(snapshot.items) as ReadonlySet<string>,
      toggleStop: store.toggleStop,
      toggleItem: store.toggleItem,
    }),
    [snapshot, store],
  );
}
