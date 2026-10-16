import type { StyleSpecification } from 'maplibre-gl';
import { describe, expect, it } from 'vitest';
import { isDashed, localizeLabels, routeFeatures, transitColor } from './style';

const style = {
  version: 8,
  sources: {},
  layers: [
    { id: 'water', type: 'fill', source: 'x', 'source-layer': 'water' },
    { id: 'place', type: 'symbol', source: 'x', 'source-layer': 'place', layout: { 'text-field': '{name:latin}' } },
    {
      id: 'poi',
      type: 'symbol',
      source: 'x',
      'source-layer': 'poi',
      layout: { 'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name']] },
    },
    { id: 'shield', type: 'symbol', source: 'x', 'source-layer': 'road', layout: { 'text-field': '{ref}' } },
    {
      id: 'housenumber',
      type: 'symbol',
      source: 'x',
      'source-layer': 'housenumber',
      layout: { 'text-field': '{housenumber}' },
    },
  ],
} as unknown as StyleSpecification;

describe('localizeLabels', () => {
  it('prefers Korean names on every layer that shows a name', () => {
    const localized = localizeLabels(style);
    const field = (id: string) =>
      (localized.layers.find((l) => l.id === id) as { layout?: Record<string, unknown> }).layout?.['text-field'];

    expect(field('place')).toEqual(['coalesce', ['get', 'name:ko'], ['get', 'name']]);
    expect(field('poi')).toEqual(['coalesce', ['get', 'name:ko'], ['get', 'name']]);
    expect(field('shield')).toBe('{ref}');
    expect(field('housenumber')).toBe('{housenumber}');
  });

  it('does not change the style it was given', () => {
    localizeLabels(style);
    expect((style.layers[1] as { layout: Record<string, unknown> }).layout['text-field']).toBe('{name:latin}');
  });
});

describe('route styling', () => {
  it('uses transit tokens and dashes walking and flights', () => {
    expect(transitColor('train')).toBe('transit-train');
    expect(transitColor('cablecar')).toBe('transit-train');
    expect(transitColor('taxi')).toBe('transit-bus');
    expect(transitColor('walk')).toBe('transit-walk');
    expect(transitColor('mystery')).toBe('ink-muted');
    expect(isDashed('walk')).toBe(true);
    expect(isDashed('flight')).toBe(true);
    expect(isDashed('bus')).toBe(false);
  });

  it('builds GeoJSON lines in lng, lat order', () => {
    const features = routeFeatures(
      [
        {
          fromKey: 'a',
          toKey: 'b',
          mode: 'walk',
          label: '도보',
          icon: '🚶',
          coordinates: [
            [34.69, 135.5],
            [34.7, 135.51],
          ],
        },
      ],
      { 'transit-walk': '#177a44' } as never,
    );

    expect(features.features[0]?.geometry.coordinates).toEqual([
      [135.5, 34.69],
      [135.51, 34.7],
    ]);
    expect(features.features[0]?.properties).toEqual({ mode: 'walk', color: '#177a44', dashed: true });
  });
});
