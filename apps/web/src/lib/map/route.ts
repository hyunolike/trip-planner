import type { DayView, LatLng, StopView } from '@/lib/trip/content';

export type MapPoint = { key: string; title: string; time: string; coordinates: LatLng; approximate: boolean };
export type RouteSegment = {
  fromKey: string;
  toKey: string;
  mode: string;
  label: string;
  icon: string;
  coordinates: LatLng[];
};

const TRANSIT_DEFAULTS: Record<string, { label: string; icon: string }> = {
  train: { label: '전철', icon: '🚆' },
  bus: { label: '버스', icon: '🚌' },
  walk: { label: '도보', icon: '🚶' },
  flight: { label: '비행기', icon: '✈️' },
  boat: { label: '배', icon: '⛴️' },
  cablecar: { label: '케이블카', icon: '🚠' },
  taxi: { label: '택시', icon: '🚕' },
  car: { label: '차량', icon: '🚐' },
};

const PLAYBACK_ZOOMS: Record<string, number> = {
  walk: 16,
  bus: 14,
  taxi: 14,
  car: 14,
  train: 13,
  boat: 13,
  cablecar: 14,
  flight: 7,
};

export const getPlaybackZoom = (mode: string) => PLAYBACK_ZOOMS[mode] ?? 14;

type Located = StopView & { coordinates: LatLng };
const located = (day: DayView) => day.stops.filter((s): s is Located => Array.isArray(s.coordinates));

export function getDayMapPoints(day: DayView): MapPoint[] {
  return located(day).map((s) => ({
    key: s.key,
    title: s.title,
    time: s.time,
    coordinates: s.coordinates,
    approximate: Boolean(s.approximate),
  }));
}

/** 기존 앱처럼 transit이 없으면 이동 아이콘 이모지로 수단을 짐작한다. */
function inferMode(transportIcon = ''): string {
  if (transportIcon.includes('✈')) return 'flight';
  if (transportIcon.includes('🚌')) return 'bus';
  if (transportIcon.includes('🚆') || transportIcon.includes('🚇')) return 'train';
  if (transportIcon.includes('⛴') || transportIcon.includes('🚤')) return 'boat';
  if (transportIcon.includes('🚠')) return 'cablecar';
  if (transportIcon.includes('🚕')) return 'taxi';
  return 'walk';
}

export function getDayRouteSegments(day: DayView): RouteSegment[] {
  const stops = located(day);
  return stops.slice(1).map((stop, index) => {
    const previous = stops[index] as Located;
    const mode = stop.transit?.mode ?? inferMode(stop.transportIcon);
    const defaults = TRANSIT_DEFAULTS[mode];
    return {
      fromKey: previous.key,
      toKey: stop.key,
      mode,
      label: stop.transit?.label ?? defaults?.label ?? '이동',
      icon: stop.transit?.icon ?? defaults?.icon ?? '📍',
      coordinates: [previous.coordinates, ...(stop.transit?.waypoints ?? []), stop.coordinates],
    };
  });
}

export function pointAlongPath(path: LatLng[], progress: number): LatLng | null {
  if (!path.length) return null;
  if (path.length === 1) return path[0] as LatLng;
  const legs = path.slice(1).map((point, index) => {
    const previous = path[index] as LatLng;
    return Math.hypot(point[0] - previous[0], point[1] - previous[1]);
  });
  const total = legs.reduce((sum, d) => sum + d, 0);
  if (total === 0) return path.at(-1) as LatLng;
  let remaining = Math.min(1, Math.max(0, progress)) * total;
  for (let index = 0; index < legs.length; index += 1) {
    const leg = legs[index] as number;
    if (remaining <= leg || index === legs.length - 1) {
      const ratio = leg === 0 ? 1 : remaining / leg;
      const start = path[index] as LatLng;
      const end = path[index + 1] as LatLng;
      return [start[0] + (end[0] - start[0]) * ratio, start[1] + (end[1] - start[1]) * ratio];
    }
    remaining -= leg;
  }
  return path.at(-1) as LatLng;
}

export const createGoogleMapsUrl = (p: LatLng) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.join(','))}`;

export function createGoogleDirectionsUrl(segment: Pick<RouteSegment, 'mode' | 'label' | 'coordinates'>): string {
  const points = segment.coordinates;
  const query = new URLSearchParams({
    api: '1',
    origin: (points[0] as LatLng).join(','),
    destination: (points.at(-1) as LatLng).join(','),
  });
  const tourBus = segment.mode === 'bus' && /투어|전용/.test(segment.label);
  const mode =
    segment.mode === 'walk'
      ? 'walking'
      : segment.mode === 'train' || (segment.mode === 'bus' && !tourBus)
        ? 'transit'
        : segment.mode === 'bus' || segment.mode === 'taxi' || segment.mode === 'car'
          ? 'driving'
          : null;
  if (mode) query.set('travelmode', mode);
  if (mode && mode !== 'transit' && points.length > 2) {
    query.set(
      'waypoints',
      points
        .slice(1, -1)
        .slice(0, 3)
        .map((p) => p.join(','))
        .join('|'),
    );
  }
  return `https://www.google.com/maps/dir/?${query.toString()}`;
}
