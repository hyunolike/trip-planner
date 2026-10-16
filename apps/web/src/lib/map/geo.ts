import type { LatLng } from '@/lib/trip/content';

/** 샘플과 API 좌표는 [위도, 경도]다. MapLibre와 GeoJSON은 [경도, 위도]다. 순서는 여기서만 바꾼다. */
export const toLngLat = ([lat, lng]: LatLng): [number, number] => [lng, lat];

export function boundsOf(points: LatLng[]): [[number, number], [number, number]] | undefined {
  if (!points.length) return undefined;
  const lats = points.map((p) => p[0]);
  const lngs = points.map((p) => p[1]);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}
