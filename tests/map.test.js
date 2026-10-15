import { describe, expect, it } from 'vitest';
import { createGoogleMapsUrl, getDayMapPoints, getDayRouteSegments, getPlaybackZoom, pointAlongPath } from '../src/map.js';
import { trip } from '../src/data.js';

describe('trip map helpers', () => {
  const day = {
    stops: [
      { id: 'a', title: 'Start', time: '09:00', transport: '🚆', coordinates: [35, 135] },
      { id: 'missing', title: 'No position' },
      {
        id: 'b',
        title: 'Finish',
        time: '10:00',
        transport: '🚆',
        coordinates: [35.1, 135.2],
        approximate: true,
        transit: { mode: 'train', label: 'JR', icon: '🚆', waypoints: [[35.05, 135.1]] },
      },
    ],
  };

  it('turns located itinerary stops into ordered map points', () => {
    expect(getDayMapPoints(day)).toEqual([
      { id: 'a', title: 'Start', time: '09:00', transport: '🚆', coordinates: [35, 135], approximate: false },
      { id: 'b', title: 'Finish', time: '10:00', transport: '🚆', coordinates: [35.1, 135.2], approximate: true },
    ]);
  });

  it('creates a Google Maps search link without exposing an API key', () => {
    expect(createGoogleMapsUrl([35.0175, 135.6784])).toBe(
      'https://www.google.com/maps/search/?api=1&query=35.0175%2C135.6784',
    );
  });

  it('builds a transit segment through its waypoints in itinerary order', () => {
    expect(getDayRouteSegments(day)).toEqual([
      {
        fromId: 'a',
        toId: 'b',
        mode: 'train',
        label: 'JR',
        icon: '🚆',
        coordinates: [[35, 135], [35.05, 135.1], [35.1, 135.2]],
      },
    ]);
  });

  it('interpolates across every leg of a transit path', () => {
    const path = [[0, 0], [0, 2], [2, 2]];
    expect(pointAlongPath(path, 0)).toEqual([0, 0]);
    expect(pointAlongPath(path, 0.5)).toEqual([0, 2]);
    expect(pointAlongPath(path, 1)).toEqual([2, 2]);
  });

  it('uses a closer follow zoom for walking than transit or flights', () => {
    expect(getPlaybackZoom('walk')).toBeGreaterThan(getPlaybackZoom('bus'));
    expect(getPlaybackZoom('bus')).toBeGreaterThan(getPlaybackZoom('flight'));
    expect(getPlaybackZoom('unknown')).toBe(14);
  });

  it('labels the family itinerary long transfers with their real transport modes', () => {
    const day1Segments = new Map(getDayRouteSegments(trip.days[0]).map((segment) => [segment.toId, segment.mode]));
    const day3Segments = new Map(getDayRouteSegments(trip.days[2]).map((segment) => [segment.toId, segment.mode]));
    const day4Segments = new Map(getDayRouteSegments(trip.days[3]).map((segment) => [segment.toId, segment.mode]));

    expect(day1Segments.get('d1-kix')).toBe('flight');
    expect(day1Segments.get('d1-hotel')).toBe('bus');
    expect(day1Segments.get('d1-castle')).toBe('train');
    expect(day3Segments.get('d3-amanohashidate')).toBe('bus');
    expect(day3Segments.get('d3-arrive')).toBe('bus');
    expect(day4Segments.get('d4-kix')).toBe('train');
  });
});
