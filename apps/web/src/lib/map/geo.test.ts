import { describe, expect, it } from 'vitest';
import { boundsOf, toLngLat } from './geo';

describe('geo', () => {
  it('turns [lat, lng] into the [lng, lat] order MapLibre expects', () => {
    expect(toLngLat([34.6937, 135.5023])).toEqual([135.5023, 34.6937]);
  });

  it('builds south-west and north-east corners in lng, lat order', () => {
    expect(
      boundsOf([
        [34.4, 135.2],
        [35.0, 135.7],
        [34.6, 135.5],
      ]),
    ).toEqual([
      [135.2, 34.4],
      [135.7, 35.0],
    ]);
    expect(boundsOf([])).toBeUndefined();
  });
});
