import type { TripDocument } from '@/lib/trip/content';
import danang from '../../../../sample/danang-hoian-family-2027.json';
import osaka from '../../../../sample/osaka-kyoto-family-2026.json';

// API 시더(SampleTripSeeder)와 같은 규칙으로 샘플 JSON을 TripDocument 모양으로 바꾼다.
const NON_CONTENT = new Set([
  'schemaVersion',
  'slug',
  'title',
  'subtitle',
  'startDate',
  'endDate',
  'timezone',
  'visibility',
  'isSample',
  'days',
  'places',
]);
const PLACE_COLUMNS = new Set(['id', 'kind', 'name', 'area']);

let sequence = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`;

// biome-ignore lint/suspicious/noExplicitAny: 샘플 JSON은 스키마 검증을 통과한 임의 구조다
type Sample = any;

export function toTripDocument(sample: Sample, overrides: Partial<TripDocument> = {}): TripDocument {
  const content = Object.fromEntries(Object.entries(sample).filter(([key]) => !NON_CONTENT.has(key)));
  return {
    id: uuid(),
    slug: sample.slug,
    title: sample.title,
    subtitle: sample.subtitle ?? null,
    startDate: sample.startDate,
    endDate: sample.endDate,
    timezone: sample.timezone ?? 'Asia/Seoul',
    visibility: sample.visibility,
    isSample: sample.isSample,
    sourceTripId: null,
    version: 1,
    content,
    days: sample.days.map((day: Sample) => ({
      id: uuid(),
      number: day.number,
      date: day.date,
      city: day.city,
      theme: day.theme,
      note: day.note ?? null,
      color: day.color ?? null,
      tour: day.tour ?? null,
      stops: day.stops.map((stop: Sample, index: number) => ({
        id: uuid(),
        key: stop.id,
        position: String(index).padStart(4, '0'),
        time: stop.time,
        title: stop.title,
        type: stop.type,
        details: stop.details,
        duration: stop.duration ?? null,
        buffer: stop.buffer ?? null,
        timing: stop.timing ?? null,
        transportIcon: stop.transportIcon ?? null,
        coordinates: stop.coordinates ?? null,
        approximate: Boolean(stop.approximate),
        transit: stop.transit ?? null,
        photo: stop.photo ?? null,
        hotelPhoto: stop.hotelPhoto ?? null,
        links: stop.links ?? null,
        placeKey: stop.placeId ?? null,
        guide: stop.guide ?? null,
        optional: Boolean(stop.optional),
        version: 1,
      })),
    })),
    places: (sample.places ?? []).map((place: Sample) => ({
      id: uuid(),
      key: place.id,
      kind: place.kind,
      name: place.name,
      area: place.area,
      details: Object.fromEntries(Object.entries(place).filter(([key]) => !PLACE_COLUMNS.has(key))),
    })),
    permissions: { canEdit: false, canClone: false },
    ...overrides,
  };
}

export const osakaTrip = () => toTripDocument(osaka);
export const danangTrip = () => toTripDocument(danang);
