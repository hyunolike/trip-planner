import { osakaTrip } from '@test/fixtures/trip';
import { describe, expect, it } from 'vitest';
import { type DayView, readTrip } from '@/lib/trip/content';
import {
  createGoogleDirectionsUrl,
  createGoogleMapsUrl,
  getDayMapPoints,
  getDayRouteSegments,
  getPlaybackZoom,
  pointAlongPath,
} from './route';

const day = {
  number: 1,
  stops: [
    { key: 'a', title: 'Start', time: '09:00', transportIcon: '🚆', coordinates: [35, 135], approximate: false },
    { key: 'missing', title: 'No position', time: '09:30', approximate: false },
    {
      key: 'b',
      title: 'Finish',
      time: '10:00',
      transportIcon: '🚆',
      coordinates: [35.1, 135.2],
      approximate: true,
      transit: { mode: 'train', label: 'JR', icon: '🚆', waypoints: [[35.05, 135.1]] },
    },
  ],
} as unknown as DayView;

describe('route helpers ported from the Vite app', () => {
  it('turns located stops into ordered map points', () => {
    expect(getDayMapPoints(day)).toEqual([
      { key: 'a', title: 'Start', time: '09:00', coordinates: [35, 135], approximate: false },
      { key: 'b', title: 'Finish', time: '10:00', coordinates: [35.1, 135.2], approximate: true },
    ]);
  });

  it('creates a Google Maps search link without an API key', () => {
    expect(createGoogleMapsUrl([35.0175, 135.6784])).toBe(
      'https://www.google.com/maps/search/?api=1&query=35.0175%2C135.6784',
    );
  });

  it('builds a segment through its waypoints in itinerary order', () => {
    expect(getDayRouteSegments(day)).toEqual([
      {
        fromKey: 'a',
        toKey: 'b',
        mode: 'train',
        label: 'JR',
        icon: '🚆',
        coordinates: [
          [35, 135],
          [35.05, 135.1],
          [35.1, 135.2],
        ],
      },
    ]);
  });

  it('interpolates across every leg of a path', () => {
    const path: [number, number][] = [
      [0, 0],
      [0, 2],
      [2, 2],
    ];
    expect(pointAlongPath(path, 0)).toEqual([0, 0]);
    expect(pointAlongPath(path, 0.5)).toEqual([0, 2]);
    expect(pointAlongPath(path, 1)).toEqual([2, 2]);
    expect(pointAlongPath([], 0.5)).toBeNull();
  });

  it('follows walking closer than buses and flights', () => {
    expect(getPlaybackZoom('walk')).toBeGreaterThan(getPlaybackZoom('bus'));
    expect(getPlaybackZoom('bus')).toBeGreaterThan(getPlaybackZoom('flight'));
    expect(getPlaybackZoom('unknown')).toBe(14);
  });

  it('keeps the real transport modes of the family itinerary', () => {
    const days = readTrip(osakaTrip()).days;
    const modes = (index: number) => new Map(getDayRouteSegments(days[index]!).map((s) => [s.toKey, s.mode]));

    expect(modes(0).get('d1-kix')).toBe('flight');
    expect(modes(0).get('d1-hotel')).toBe('bus');
    expect(modes(0).get('d1-castle')).toBe('train');
    expect(modes(2).get('d3-amanohashidate')).toBe('bus');
    expect(modes(2).get('d3-arrive')).toBe('bus');
    expect(modes(3).get('d4-kix')).toBe('train');
  });

  it('links Google directions with official parameters only', () => {
    const train = new URL(
      createGoogleDirectionsUrl({
        mode: 'train',
        label: 'JR',
        coordinates: [
          [35, 135],
          [35.1, 135.2],
          [35.2, 135.3],
        ],
      }),
    );
    expect(`${train.origin}${train.pathname}`).toBe('https://www.google.com/maps/dir/');
    expect(train.searchParams.get('origin')).toBe('35,135');
    expect(train.searchParams.get('destination')).toBe('35.2,135.3');
    expect(train.searchParams.get('travelmode')).toBe('transit');
    expect(train.searchParams.has('waypoints')).toBe(false);

    const walk = new URL(
      createGoogleDirectionsUrl({
        mode: 'walk',
        label: '도보',
        coordinates: [
          [35, 135],
          [35.1, 135.2],
          [35.2, 135.3],
        ],
      }),
    );
    expect(walk.searchParams.get('travelmode')).toBe('walking');
    expect(walk.searchParams.get('waypoints')).toBe('35.1,135.2');

    const tourBus = new URL(
      createGoogleDirectionsUrl({
        mode: 'bus',
        label: '투어 버스',
        coordinates: [
          [35, 135],
          [35.2, 135.3],
        ],
      }),
    );
    expect(tourBus.searchParams.get('travelmode')).toBe('driving');
  });
});
