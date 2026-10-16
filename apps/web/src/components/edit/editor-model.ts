import type { QueuedMutation } from '@/lib/edit/queue';
import { type EditMutation, editMutation } from '@/lib/edit/transport';
import type { StopDocument, TripDocument } from '@/lib/trip/content';

export function projectEdits(original: TripDocument, operations: readonly QueuedMutation[]): TripDocument {
  let trip = {
    ...original,
    days: original.days.map((day) => ({ ...day, stops: day.stops.map((stop) => ({ ...stop })) })),
  };
  for (const operation of operations) {
    let mutation: EditMutation;
    try {
      mutation = editMutation(operation);
    } catch {
      continue;
    }
    switch (mutation.type) {
      case 'trip.update':
        trip = {
          ...trip,
          title: mutation.payload.body.title ?? trip.title,
          startDate: mutation.payload.body.startDate ?? trip.startDate,
          endDate: mutation.payload.body.endDate ?? trip.endDate,
          visibility: mutation.payload.body.visibility ?? trip.visibility,
        };
        break;
      case 'day.update':
        trip.days = trip.days.map((day) =>
          day.id === mutation.payload.dayId
            ? {
                ...day,
                city: mutation.payload.body.city ?? day.city,
                theme: mutation.payload.body.theme ?? day.theme,
                note: mutation.payload.body.note ?? day.note,
              }
            : day,
        );
        break;
      case 'stop.update':
        trip.days = trip.days.map((day) => ({
          ...day,
          stops: day.stops.map((stop) =>
            stop.id === mutation.payload.stopId
              ? {
                  ...stop,
                  ...mutation.payload.body,
                  title: mutation.payload.body.title ?? stop.title,
                  time: mutation.payload.body.time ?? stop.time,
                  type: mutation.payload.body.type ?? stop.type,
                  details: mutation.payload.body.details ?? stop.details,
                  version: stop.version,
                  ...(mutation.payload.body.clearCoordinates ? { coordinates: null } : {}),
                }
              : stop,
          ),
        }));
        break;
      case 'stop.delete':
        trip.days = trip.days.map((day) => ({
          ...day,
          stops: day.stops.filter((stop) => stop.id !== mutation.payload.stopId),
        }));
        break;
      case 'stop.order':
        trip.days = trip.days.map((day) => {
          if (day.id !== mutation.payload.dayId) return day;
          const byId = new Map(day.stops.map((stop) => [stop.id, stop]));
          return { ...day, stops: mutation.payload.body.stopIds.flatMap((id) => byId.get(id) ?? []) };
        });
        break;
      case 'stop.create':
        trip.days = trip.days.map((day) => {
          if (day.id !== mutation.payload.dayId) return day;
          const body = mutation.payload.body;
          const stop: StopDocument = {
            id: `pending-${operation.id}`,
            key: `pending-${operation.id}`,
            title: body.title,
            time: body.time,
            type: body.type ?? 'sight',
            details: body.details ?? '',
            duration: body.duration,
            coordinates: body.coordinates,
            links: body.links,
            version: 0,
            approximate: false,
            optional: false,
            position: 'pending',
          };
          return { ...day, stops: [...day.stops, stop] };
        });
        break;
    }
  }
  return trip;
}
