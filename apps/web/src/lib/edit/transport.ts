'use client';

import { z } from 'zod';
import { api } from '@/lib/api/client';
import type { components } from '@/lib/api/schema';
import type { TripDocument } from '@/lib/trip/content';
import type { JsonRecord, MutationQueue, QueuedMutation } from './queue';

type Schemas = components['schemas'];
export type EditMutation =
  | { type: 'stop.create'; payload: { dayId: string; body: Schemas['CreateStopRequest'] } }
  | { type: 'stop.update'; payload: { stopId: string; body: Schemas['UpdateStopRequest'] } }
  | { type: 'stop.delete'; payload: { stopId: string; version: number } }
  | { type: 'stop.order'; payload: { dayId: string; body: Schemas['ReorderRequest'] } }
  | { type: 'day.update'; payload: { dayId: string; body: Schemas['UpdateDayRequest'] } }
  | { type: 'trip.update'; payload: { body: Schemas['UpdateTripRequest'] } };

/** Generated request bodies cross a JSON persistence boundary here; no API response is retyped. */
export function enqueueEdit(queue: MutationQueue, mutation: EditMutation) {
  const payload = JSON.parse(JSON.stringify(mutation.payload)) as JsonRecord;
  return queue.enqueue(mutation.type, payload);
}

const identifier = z.uuid();
const version = z.number().int().nonnegative();
const text = z.string().nullable().optional();
const stopFields = z.object({
  title: text,
  time: text,
  type: text,
  details: text,
  duration: text,
  buffer: text,
  coordinates: z.array(z.number().finite()).length(2).nullable().optional(),
  clearCoordinates: z.boolean().optional(),
  links: z
    .array(
      z.object({
        label: z.string(),
        url: z.url().refine((value) => /^https?:/.test(value)),
        note: z.string().nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
});
const persistedMutation = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('stop.create'),
    payload: z.object({
      dayId: identifier,
      body: stopFields.extend({
        title: z.string().trim().min(1),
        time: z.string(),
        afterStopId: identifier.nullable().optional(),
        clientMutationId: identifier.nullable().optional(),
      }),
    }),
  }),
  z.object({
    type: z.literal('stop.update'),
    payload: z.object({ stopId: identifier, body: stopFields.extend({ version }) }),
  }),
  z.object({ type: z.literal('stop.delete'), payload: z.object({ stopId: identifier, version }) }),
  z.object({
    type: z.literal('stop.order'),
    payload: z.object({ dayId: identifier, body: z.object({ stopIds: z.array(identifier).min(1) }) }),
  }),
  z.object({
    type: z.literal('day.update'),
    payload: z.object({ dayId: identifier, body: z.object({ version, city: text, theme: text, note: text }) }),
  }),
  z.object({
    type: z.literal('trip.update'),
    payload: z.object({ body: z.object({ version, title: text, startDate: text, endDate: text, visibility: text }) }),
  }),
]);

/** Validate restored local data before it can supply an API path or body. */
export function editMutation(operation: QueuedMutation): EditMutation {
  return persistedMutation.parse({ type: operation.type, payload: operation.payload });
}

function advanceVersion(versions: Map<number, number>, before: number, after: number) {
  for (const [base, current] of versions) if (current === before) versions.set(base, after);
  versions.set(before, after);
}

export function createEditTransport(options: {
  userId: string;
  getTrip: () => TripDocument;
  onTrip: (trip: TripDocument) => void;
  onIdentity: (id: string | null) => void;
}) {
  const stopVersions = new Map<string, Map<number, number>>();
  const tripVersions = new Map<number, number>();
  function stopMap(id: string) {
    let map = stopVersions.get(id);
    if (!map) {
      map = new Map();
      stopVersions.set(id, map);
    }
    return map;
  }
  return async (operation: QueuedMutation): Promise<{ status: number }> => {
    // Verify the live session before every replay, including reconnects and tabs that switched account.
    const me = await api.GET('/api/v1/me');
    const currentUser = me.data?.id ?? null;
    options.onIdentity(currentUser);
    if (currentUser !== options.userId || operation.userId !== currentUser || operation.tripId !== options.getTrip().id)
      return { status: 401 };
    let mutation: EditMutation;
    try {
      mutation = editMutation(operation);
    } catch {
      return { status: 409 };
    }
    const tripBefore = options.getTrip();
    let expectedTripVersion = tripBefore.version + 1;
    let status: number;
    switch (mutation.type) {
      case 'stop.create': {
        const result = await api.POST('/api/v1/days/{dayId}/stops', {
          params: { path: { dayId: mutation.payload.dayId } },
          body: { ...mutation.payload.body, clientMutationId: operation.id },
        });
        status = result.response.status;
        break;
      }
      case 'stop.update': {
        const { stopId, body } = mutation.payload;
        const versions = stopMap(stopId);
        const sentVersion = versions.get(body.version) ?? body.version;
        const result = await api.PATCH('/api/v1/stops/{stopId}', {
          params: { path: { stopId } },
          body: { ...body, version: sentVersion },
        });
        status = result.response.status;
        if (result.data) advanceVersion(versions, sentVersion, result.data.version);
        break;
      }
      case 'stop.delete': {
        const { stopId, version } = mutation.payload;
        const result = await api.DELETE('/api/v1/stops/{stopId}', {
          params: { path: { stopId }, query: { version: stopMap(stopId).get(version) ?? version } },
        });
        status = result.response.status;
        break;
      }
      case 'stop.order': {
        const result = await api.PUT('/api/v1/days/{dayId}/stops/order', {
          params: { path: { dayId: mutation.payload.dayId } },
          body: mutation.payload.body,
        });
        status = result.response.status;
        for (const stop of result.data ?? []) {
          const before = tripBefore.days.flatMap((day) => day.stops).find((item) => item.id === stop.id);
          if (before && stop.version === before.version + 1)
            advanceVersion(stopMap(stop.id), before.version, stop.version);
        }
        break;
      }
      case 'day.update': {
        const body = mutation.payload.body;
        const sentVersion = tripVersions.get(body.version) ?? body.version;
        const result = await api.PATCH('/api/v1/days/{dayId}', {
          params: { path: { dayId: mutation.payload.dayId } },
          body: { ...body, version: sentVersion },
        });
        status = result.response.status;
        if (result.data) {
          advanceVersion(tripVersions, sentVersion, result.data.version);
          expectedTripVersion = result.data.version;
          options.onTrip(result.data);
        }
        break;
      }
      case 'trip.update': {
        const body = mutation.payload.body;
        const sentVersion = tripVersions.get(body.version) ?? body.version;
        const result = await api.PATCH('/api/v1/trips/{tripId}', {
          params: { path: { tripId: options.getTrip().id } },
          body: { ...body, version: sentVersion },
        });
        status = result.response.status;
        if (result.data) {
          advanceVersion(tripVersions, sentVersion, result.data.version);
          expectedTripVersion = result.data.version;
          options.onTrip(result.data);
        }
        break;
      }
    }
    if (status >= 200 && status < 300) {
      // Stop writes also increment the trip version. Refresh before the next queued metadata write.
      const latest = await api.GET('/api/v1/trips/{slug}', { params: { path: { slug: options.getTrip().slug } } });
      if (latest.data) {
        if (mutation.type.startsWith('stop.') && latest.data.version === expectedTripVersion)
          advanceVersion(tripVersions, tripBefore.version, latest.data.version);
        options.onTrip(latest.data);
      }
    }
    return { status };
  };
}
