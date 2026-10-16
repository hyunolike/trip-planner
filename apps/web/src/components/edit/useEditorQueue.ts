'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import { createMutationQueue, type MutationQueue, type QueueSnapshot } from '@/lib/edit/queue';
import { createEditTransport, type EditMutation, enqueueEdit } from '@/lib/edit/transport';
import type { TripDocument } from '@/lib/trip/content';

const EMPTY: QueueSnapshot = { operations: [], status: 'idle', error: null };

export function useEditorQueue(initialTrip: TripDocument, userId: string) {
  const [trip, setTrip] = useState(initialTrip);
  const [snapshot, setSnapshot] = useState<QueueSnapshot>(EMPTY);
  const queue = useRef<MutationQueue | null>(null);
  const currentTrip = useRef(initialTrip);
  const currentUser = useRef<string | null>(userId);

  useEffect(() => {
    if (!initialTrip.permissions.canEdit || initialTrip.isSample) return;
    let active = true;
    const instance = createMutationQueue({
      userId,
      tripId: initialTrip.id,
      storage: {
        getItem: (key) => localStorage.getItem(key),
        setItem: (key, value) => localStorage.setItem(key, value),
      },
      getCurrentUserId: () => currentUser.current,
      transport: createEditTransport({
        userId,
        getTrip: () => currentTrip.current,
        onIdentity: (id) => {
          currentUser.current = id;
        },
        onTrip: (document) => {
          currentTrip.current = document;
          if (active) setTrip(document);
        },
      }),
    });
    queue.current = instance;
    const update = () => {
      if (active) setSnapshot(instance.getSnapshot());
    };
    const unsubscribe = instance.subscribe(update);
    update();
    const reconnect = () => {
      if (instance.getSnapshot().status === 'offline') void instance.retry();
      else void instance.flush();
    };
    const offline = () => update();
    window.addEventListener('online', reconnect);
    window.addEventListener('offline', offline);
    void instance.flush();
    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener('online', reconnect);
      window.removeEventListener('offline', offline);
      queue.current = null;
    };
  }, [initialTrip.id, initialTrip.permissions.canEdit, initialTrip.isSample, userId]);

  const mutate = useCallback(async (mutation: EditMutation) => {
    const instance = queue.current;
    if (!instance) throw new Error('편집 화면을 준비하고 있어요. 잠시 후 다시 시도해 주세요.');
    const state = instance.getSnapshot();
    if (['auth', 'conflict', 'storage-error'].includes(state.status))
      throw new Error(state.error ?? '저장하지 못한 변경사항을 먼저 확인해 주세요.');
    if (mutation.type === 'trip.update' && (!navigator.onLine || state.operations.length))
      throw new Error('여행 날짜와 제목은 연결된 상태에서 변경사항을 저장한 뒤 수정해 주세요.');
    enqueueEdit(instance, mutation);
    await instance.flush();
    const result = instance.getSnapshot();
    if (['auth', 'conflict', 'storage-error'].includes(result.status))
      throw new Error(result.error ?? '입력을 저장하지 못했어요.');
  }, []);

  const retry = useCallback(async () => {
    const me = await api.GET('/api/v1/me');
    currentUser.current = me.data?.id ?? null;
    await queue.current?.retry();
  }, []);
  const refresh = useCallback(async () => {
    const result = await api.GET('/api/v1/trips/{slug}', { params: { path: { slug: currentTrip.current.slug } } });
    if (result.data) {
      currentTrip.current = result.data;
      setTrip(result.data);
    }
  }, []);

  return { trip, snapshot, mutate, retry, refresh, discard: (id: string) => queue.current?.discard(id) };
}
