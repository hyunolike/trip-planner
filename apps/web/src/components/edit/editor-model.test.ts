import { osakaTrip } from '@test/fixtures/trip';
import { expect, it } from 'vitest';
import type { QueuedMutation } from '@/lib/edit/queue';
import { projectEdits } from './editor-model';

it('shows queued edits without changing the original document or its versions', () => {
  const trip = osakaTrip();
  const first = trip.days[0]!.stops[0]!;
  const operation: QueuedMutation = {
    id: 'id',
    userId: 'user',
    tripId: trip.id,
    type: 'stop.update',
    payload: { stopId: first.id, body: { version: 1, title: '오프라인 수정' } },
    createdAt: 1,
  };
  const result = projectEdits(trip, [operation]);
  expect(result.days[0]!.stops[0]!.title).toBe('오프라인 수정');
  expect(trip.days[0]!.stops[0]!.title).toBe(first.title);
  expect(result.days[0]!.stops[0]!.version).toBe(first.version);
});

it('keeps offline stop additions and accessible reorder visible after restoration', () => {
  const trip = osakaTrip();
  const day = trip.days[0]!;
  const operations: QueuedMutation[] = [
    {
      id: 'new-id',
      userId: 'user',
      tripId: trip.id,
      type: 'stop.create',
      payload: { dayId: day.id, body: { title: '새 장소', time: '18:00' } },
      createdAt: 1,
    },
  ];
  expect(projectEdits(trip, operations).days[0]!.stops.at(-1)).toMatchObject({
    title: '새 장소',
    id: 'pending-new-id',
  });
});
