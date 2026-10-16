import type { ColorName } from '@tripnote/design-tokens';
import type { FeatureCollection, LineString } from 'geojson';
import type { StyleSpecification } from 'maplibre-gl';
import { toLngLat } from './geo';
import type { RouteSegment } from './route';

const KOREAN_FIRST = ['coalesce', ['get', 'name:ko'], ['get', 'name']];

/** 이름을 그리는 심볼 레이어만 한국어 이름을 먼저 쓰게 바꾼다. 도로 번호와 번지는 그대로 둔다. */
export function localizeLabels(style: StyleSpecification): StyleSpecification {
  return {
    ...style,
    layers: style.layers.map((layer) => {
      if (layer.type !== 'symbol') return layer;
      const field = layer.layout?.['text-field'];
      if (field === undefined) return layer;
      const text = JSON.stringify(field);
      if (!/name/.test(text)) return layer;
      return { ...layer, layout: { ...layer.layout, 'text-field': KOREAN_FIRST as never } };
    }),
  };
}

const COLORS: Record<string, ColorName> = {
  flight: 'transit-flight',
  train: 'transit-train',
  cablecar: 'transit-train',
  bus: 'transit-bus',
  taxi: 'transit-bus',
  car: 'transit-bus',
  walk: 'transit-walk',
  boat: 'transit-boat',
};

export const transitColor = (mode: string): ColorName => COLORS[mode] ?? 'ink-muted';
export const isDashed = (mode: string) => mode === 'walk' || mode === 'flight';

export function routeFeatures(
  segments: RouteSegment[],
  palette: Record<ColorName, string>,
): FeatureCollection<LineString, { mode: string; color: string; dashed: boolean }> {
  return {
    type: 'FeatureCollection',
    features: segments.map((segment) => ({
      type: 'Feature',
      properties: { mode: segment.mode, color: palette[transitColor(segment.mode)], dashed: isDashed(segment.mode) },
      geometry: { type: 'LineString', coordinates: segment.coordinates.map(toLngLat) },
    })),
  };
}
