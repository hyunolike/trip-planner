import type { DayView, LatLng } from '@/lib/trip/content';

const average = (points: LatLng[]): LatLng => [
  points.reduce((sum, p) => sum + p[0], 0) / points.length,
  points.reduce((sum, p) => sum + p[1], 0) / points.length,
];

export function weatherPointForDay(day: DayView): { label: string; coordinates: LatLng } | undefined {
  const located = day.stops.filter((s) => s.coordinates);
  const ground = located.filter((s) => s.type !== 'airport' && s.type !== 'flight');
  const pick = (ground.length ? ground : located).map((s) => s.coordinates as LatLng);
  return pick.length ? { label: day.city, coordinates: average(pick) } : undefined;
}
