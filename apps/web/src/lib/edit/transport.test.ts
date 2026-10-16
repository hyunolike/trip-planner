import { osakaTrip } from '@test/fixtures/trip';
import { beforeEach, expect, it, vi } from 'vitest';
import type { QueuedMutation } from './queue';
import { createEditTransport, editMutation } from './transport';

const { get, post, patch, put, remove } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('@/lib/api/client', () => ({ api: { GET: get, POST: post, PATCH: patch, PUT: put, DELETE: remove } }));
beforeEach(() => vi.clearAllMocks());

it('fails closed on malformed persisted mutation payloads', () => {
  const trip = osakaTrip();
  expect(() =>
    editMutation({ id: 'op', userId: 'user', tripId: trip.id, type: 'stop.delete', payload: {}, createdAt: 1 }),
  ).toThrow();
  expect(() =>
    editMutation({
      id: 'op',
      userId: 'user',
      tripId: trip.id,
      type: 'stop.update',
      payload: { stopId: trip.days[0]!.stops[0]!.id, body: { version: 'wrong', title: 'title' } },
      createdAt: 1,
    }),
  ).toThrow();
});

it('never sends a previous user mutation after the live account changed', async () => {
  const trip = osakaTrip();
  get.mockResolvedValue({ data: { id: 'another-user' }, response: { status: 200 } });
  const transport = createEditTransport({ userId: 'owner', getTrip: () => trip, onTrip: vi.fn(), onIdentity: vi.fn() });
  expect(
    await transport({
      id: 'op',
      userId: 'owner',
      tripId: trip.id,
      type: 'stop.create',
      payload: { dayId: trip.days[0]!.id, body: { title: 'new', time: '09:00' } },
      createdAt: 1,
    }),
  ).toEqual({ status: 401 });
  expect(post).not.toHaveBeenCalled();
});

it('rebases sequential own stop edits on their acknowledged version', async () => {
  let trip = osakaTrip();
  const stop = trip.days[0]!.stops[0]!;
  let stopVersion = 1;
  get.mockImplementation(async (path: string) => ({
    data: path === '/api/v1/me' ? { id: 'owner' } : trip,
    response: { status: 200 },
  }));
  patch.mockImplementation(async () => {
    stopVersion++;
    trip = { ...trip, version: trip.version + 1 };
    return { data: { ...stop, version: stopVersion }, response: { status: 200 } };
  });
  const transport = createEditTransport({
    userId: 'owner',
    getTrip: () => trip,
    onTrip: (next) => {
      trip = next;
    },
    onIdentity: vi.fn(),
  });
  const operation: QueuedMutation = {
    id: 'op',
    userId: 'owner',
    tripId: trip.id,
    type: 'stop.update',
    payload: { stopId: stop.id, body: { title: 'one', version: 1 } },
    createdAt: 1,
  };
  await transport(operation);
  await transport({ ...operation, id: 'op2' });
  expect(patch.mock.calls[1]![1].body.version).toBe(2);
});

it('keeps queued metadata stale when refresh reveals an unexpected concurrent trip edit', async () => {
  const original = osakaTrip();
  let trip = original;
  const stop = original.days[0]!.stops[0]!;
  get.mockImplementation(async (path: string) => ({
    data: path === '/api/v1/me' ? { id: 'owner' } : { ...original, version: 4 },
    response: { status: 200 },
  }));
  patch.mockImplementation(async (path: string) =>
    path === '/api/v1/stops/{stopId}'
      ? { data: { ...stop, version: 2 }, response: { status: 200 } }
      : { response: { status: 409 } },
  );
  const transport = createEditTransport({
    userId: 'owner',
    getTrip: () => trip,
    onTrip: (next) => {
      trip = next;
    },
    onIdentity: vi.fn(),
  });
  const operation: QueuedMutation = {
    id: 'op',
    userId: 'owner',
    tripId: trip.id,
    type: 'stop.update',
    payload: { stopId: stop.id, body: { title: 'one', version: 1 } },
    createdAt: 1,
  };
  await transport(operation);
  await transport({
    ...operation,
    id: 'op2',
    type: 'day.update',
    payload: { dayId: original.days[0]!.id, body: { version: 1, theme: 'stale theme' } },
  });
  expect(patch.mock.calls[1]![1].body.version).toBe(1);
});

it('preserves a stale draft base version after reloading newer server data', async () => {
  const trip = { ...osakaTrip(), version: 5 };
  get.mockResolvedValue({ data: { id: 'owner' }, response: { status: 200 } });
  patch.mockResolvedValue({ response: { status: 409 } });
  const transport = createEditTransport({ userId: 'owner', getTrip: () => trip, onTrip: vi.fn(), onIdentity: vi.fn() });
  await transport({
    id: 'op',
    userId: 'owner',
    tripId: trip.id,
    type: 'trip.update',
    payload: { body: { title: 'stale', version: 1 } },
    createdAt: 1,
  });
  expect(patch.mock.calls[0]![1].body.version).toBe(1);
});
