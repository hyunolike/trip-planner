import { osakaTrip } from '@test/fixtures/trip';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCompletionStore } from './completion';
import { readTrip } from './content';
import { useTripCompletion } from './useTripCompletion';

function fixture() {
  const trip = readTrip(osakaTrip());
  const first = trip.days[0]?.stops[0];
  const second = trip.days[0]?.stops[1];
  if (!first || !second) throw new Error('Expected fixture stops');
  return { trip, first, second };
}

function server() {
  const state = {
    userId: 'alice' as string | null,
    allowRead: true,
    failWrites: false,
    loseResponse: false,
    nextMe: null as Promise<Response> | null,
    meRequests: 0,
    reads: [] as string[],
    writes: [] as { userId: string; method: string; stopId: string }[],
    completed: new Map<string, Set<string>>(),
  };
  vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
    const request = input as Request;
    const path = new URL(request.url).pathname;
    if (path.endsWith('/auth/csrf')) return new Response(null, { status: 200 });
    if (path === '/api/v1/me') {
      state.meRequests++;
      if (state.nextMe) return state.nextMe;
      return state.userId
        ? Response.json({ id: state.userId, email: `${state.userId}@example.test`, nickname: state.userId })
        : new Response(null, { status: 401 });
    }
    if (path.endsWith('/completions') && request.method === 'GET') {
      state.reads.push(state.userId ?? 'guest');
      if (!state.allowRead) return new Response(null, { status: 403 });
      return Response.json([...(state.completed.get(state.userId ?? '') ?? [])]);
    }
    const match = path.match(/\/completions\/stops\/([^/]+)$/);
    if (match) {
      if (!state.userId) return new Response(null, { status: 401 });
      if (state.failWrites) throw new TypeError('Offline');
      const stopId = decodeURIComponent(match[1] ?? '');
      state.writes.push({ userId: state.userId, method: request.method, stopId });
      const completed = state.completed.get(state.userId) ?? new Set<string>();
      if (request.method === 'PUT') completed.add(stopId);
      if (request.method === 'DELETE') completed.delete(stopId);
      state.completed.set(state.userId, completed);
      if (state.loseResponse) {
        state.loseResponse = false;
        throw new TypeError('Response lost after server commit');
      }
      return new Response(null, { status: 204 });
    }
    return new Response(null, { status: 404 });
  });
  return state;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useTripCompletion', () => {
  it('exposes readiness while initial guest identity is unresolved and accepts a toggle once ready', async () => {
    const state = server();
    const { trip, first } = fixture();
    let resolveIdentity: (response: Response) => void = () => {};
    state.nextMe = new Promise((resolve) => {
      resolveIdentity = resolve;
    });
    const { result } = renderHook(() => useTripCompletion(trip));
    expect(result.current.ready).toBe(false);
    act(() => result.current.toggleStop(first.key));
    expect(createCompletionStore(trip.slug).getSnapshot().stops).toEqual([]);
    await act(async () => resolveIdentity(new Response(null, { status: 401 })));
    expect(result.current.ready).toBe(true);
    act(() => result.current.toggleStop(first.key));
    expect(result.current.stops.has(first.key)).toBe(true);
    expect(state.writes).toEqual([]);
  });

  it('keeps anonymous stop and checklist progress in the existing guest store', async () => {
    const state = server();
    state.userId = null;
    const { trip, first, second } = fixture();
    createCompletionStore(trip.slug).toggleStop(first.key);
    const { result } = renderHook(() => useTripCompletion(trip));
    await waitFor(() => expect(result.current.stops.has(first.key)).toBe(true));
    act(() => {
      result.current.toggleStop(second.key);
      result.current.toggleItem('passports');
    });
    expect(createCompletionStore(trip.slug).getSnapshot()).toEqual({
      stops: [first.key, second.key],
      items: ['passports'],
    });
    expect(state.writes).toEqual([]);
  });

  it('maps server stop IDs to view keys and uses idempotent PUT and DELETE after verifying the session', async () => {
    const state = server();
    const { trip, first, second } = fixture();
    state.completed.set('alice', new Set([first.id]));
    const { result } = renderHook(() => useTripCompletion(trip));
    await waitFor(() => expect(result.current.stops.has(first.key)).toBe(true));
    const checksBeforeWrite = state.meRequests;
    act(() => result.current.toggleStop(second.key));
    await waitFor(() => expect(state.completed.get('alice')?.has(second.id)).toBe(true));
    expect(state.meRequests).toBeGreaterThan(checksBeforeWrite);
    act(() => result.current.toggleStop(first.key));
    await waitFor(() => expect(state.completed.get('alice')?.has(first.id)).toBe(false));
    expect(state.writes).toEqual([
      { userId: 'alice', method: 'PUT', stopId: second.id },
      { userId: 'alice', method: 'DELETE', stopId: first.id },
    ]);
    expect(createCompletionStore(trip.slug).getSnapshot().stops).toEqual([]);
  });

  it('claims guest checks once and never imports them into a second account', async () => {
    const state = server();
    const { trip, first, second } = fixture();
    const guest = createCompletionStore(trip.slug);
    guest.toggleStop(first.key);
    guest.toggleItem('passports');
    const alice = renderHook(() => useTripCompletion(trip));
    await waitFor(() => expect(state.completed.get('alice')?.has(first.id)).toBe(true));
    await waitFor(() => expect(alice.result.current.items.has('passports')).toBe(true));
    alice.unmount();
    guest.toggleStop(second.key);
    state.userId = 'bob';
    const bob = renderHook(() => useTripCompletion(trip));
    await waitFor(() => expect(state.reads).toContain('bob'));
    await act(async () => {});
    expect(bob.result.current.stops.size).toBe(0);
    expect(bob.result.current.items.size).toBe(0);
    expect(state.writes.some((write) => write.userId === 'bob')).toBe(false);
  });

  it('hides the previous account immediately during a new identity lookup and drops stale results', async () => {
    const state = server();
    const { trip, first, second } = fixture();
    state.completed.set('alice', new Set([first.id]));
    state.completed.set('bob', new Set([second.id]));
    const { result } = renderHook(() => useTripCompletion(trip));
    await waitFor(() => expect(result.current.stops.has(first.key)).toBe(true));
    expect(result.current.ready).toBe(true);
    let resolveOld: (response: Response) => void = () => {};
    state.nextMe = new Promise((resolve) => {
      resolveOld = resolve;
    });
    act(() => window.dispatchEvent(new Event('focus')));
    expect(result.current.stops.size).toBe(0);
    expect(result.current.ready).toBe(false);
    act(() => result.current.toggleStop(second.key));
    expect(state.writes).toEqual([]);
    state.nextMe = null;
    state.userId = 'bob';
    act(() => window.dispatchEvent(new Event('focus')));
    await waitFor(() => expect(result.current.stops.has(second.key)).toBe(true));
    expect(result.current.ready).toBe(true);
    await act(async () => resolveOld(Response.json({ id: 'alice' })));
    expect(result.current.stops.has(first.key)).toBe(false);
    expect(result.current.stops.has(second.key)).toBe(true);
  });

  it('never writes the old account draft when the live session changes before a toggle is sent', async () => {
    const state = server();
    const { trip, first, second } = fixture();
    state.completed.set('alice', new Set([first.id]));
    state.completed.set('bob', new Set([second.id]));
    const { result } = renderHook(() => useTripCompletion(trip));
    await waitFor(() => expect(result.current.stops.has(first.key)).toBe(true));
    state.userId = 'bob';
    act(() => result.current.toggleStop(second.key));
    await waitFor(() => expect(state.reads).toContain('bob'));
    await act(async () => {});
    expect(state.writes).toEqual([]);
    expect(result.current.stops.has(first.key)).toBe(false);
    expect(result.current.stops.has(second.key)).toBe(true);
  });

  it('preserves an offline draft through reload and replays only for its original account', async () => {
    const state = server();
    const { trip, first } = fixture();
    const alice = renderHook(() => useTripCompletion(trip));
    await waitFor(() => expect(state.reads).toContain('alice'));
    await act(async () => {});
    state.failWrites = true;
    act(() => alice.result.current.toggleStop(first.key));
    await waitFor(() => expect(alice.result.current.stops.has(first.key)).toBe(true));
    await act(async () => {});
    alice.unmount();
    state.userId = 'bob';
    const bob = renderHook(() => useTripCompletion(trip));
    await waitFor(() => expect(state.reads).toContain('bob'));
    await act(async () => {});
    expect(bob.result.current.stops.has(first.key)).toBe(false);
    expect(state.writes).toEqual([]);
    bob.unmount();
    state.userId = 'alice';
    const reloaded = renderHook(() => useTripCompletion(trip));
    await waitFor(() => expect(reloaded.result.current.stops.has(first.key)).toBe(true));
    state.failWrites = false;
    act(() => window.dispatchEvent(new Event('online')));
    await waitFor(() => expect(state.completed.get('alice')?.has(first.id)).toBe(true));
    expect(state.writes).toEqual([{ userId: 'alice', method: 'PUT', stopId: first.id }]);
  });

  it('recovers a lost completion response without toggling the server back off', async () => {
    const state = server();
    const { trip, first } = fixture();
    const hook = renderHook(() => useTripCompletion(trip));
    await waitFor(() => expect(state.reads).toContain('alice'));
    await act(async () => {});
    state.loseResponse = true;
    act(() => hook.result.current.toggleStop(first.key));
    await waitFor(() => expect(state.completed.get('alice')?.has(first.id)).toBe(true));
    hook.unmount();
    const reloaded = renderHook(() => useTripCompletion(trip));
    await waitFor(() => expect(state.writes).toHaveLength(2));
    expect(state.writes.every((write) => write.method === 'PUT')).toBe(true);
    expect(state.completed.get('alice')?.size).toBe(1);
    expect(reloaded.result.current.stops.has(first.key)).toBe(true);
  });

  it('keeps forbidden private-share progress local to the authenticated account without server writes', async () => {
    const state = server();
    const { trip, first } = fixture();
    state.allowRead = false;
    createCompletionStore(trip.slug).toggleItem('guest-only');
    const hook = renderHook(() => useTripCompletion(trip));
    await waitFor(() => expect(state.reads).toContain('alice'));
    await act(async () => {});
    act(() => {
      hook.result.current.toggleStop(first.key);
      hook.result.current.toggleItem('local-only');
    });
    expect(hook.result.current.stops.has(first.key)).toBe(true);
    expect(hook.result.current.ready).toBe(true);
    expect(hook.result.current.items.has('local-only')).toBe(true);
    expect(hook.result.current.items.has('guest-only')).toBe(false);
    hook.unmount();
    const reloaded = renderHook(() => useTripCompletion(trip));
    await waitFor(() => expect(reloaded.result.current.stops.has(first.key)).toBe(true));
    expect(state.writes).toEqual([]);
  });

  it('preserves a later unchecked draft while recovering an unfinished guest migration', async () => {
    const state = server();
    const { trip, first } = fixture();
    createCompletionStore(trip.slug).toggleStop(first.key);
    const originalWrite = Storage.prototype.setItem;
    let blockDone = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (blockDone && key.startsWith('tripnote:completion-import:') && JSON.parse(value).done === true) {
        throw new Error('Cannot finish migration marker');
      }
      originalWrite.call(this, key, value);
    });
    const hook = renderHook(() => useTripCompletion(trip));
    await waitFor(() => expect(hook.result.current.stops.has(first.key)).toBe(true));
    expect(state.writes).toEqual([]);
    act(() => hook.result.current.toggleStop(first.key));
    expect(hook.result.current.stops.has(first.key)).toBe(false);
    expect(state.writes).toEqual([]);
    blockDone = false;
    act(() => window.dispatchEvent(new Event('online')));
    await waitFor(() => expect(state.writes).toHaveLength(2));
    await act(async () => {});
    expect(state.completed.get('alice')?.has(first.id)).toBe(false);
    expect(hook.result.current.stops.has(first.key)).toBe(false);
    hook.unmount();
    renderHook(() => useTripCompletion(trip));
    await act(async () => {});
    expect(state.writes).toHaveLength(2);
  });

  it('retries a guest import after the durable queue could not save its draft', async () => {
    const state = server();
    const { trip, first } = fixture();
    createCompletionStore(trip.slug).toggleStop(first.key);
    const originalWrite = Storage.prototype.setItem;
    let blockQueue = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (blockQueue && key.startsWith('tripnote:edit-queue:')) throw new Error('Queue storage full');
      originalWrite.call(this, key, value);
    });
    const hook = renderHook(() => useTripCompletion(trip));
    await waitFor(() => expect(hook.result.current.stops.has(first.key)).toBe(true));
    expect(state.writes).toEqual([]);
    blockQueue = false;
    act(() => window.dispatchEvent(new Event('online')));
    await waitFor(() => expect(state.completed.get('alice')?.has(first.id)).toBe(true));
    expect(hook.result.current.stops.has(first.key)).toBe(true);
  });
});
