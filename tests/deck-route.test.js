import { expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { hotelLucuaRoute, walkingMaps, renderDeckGuide } from '../src/deck-route.js';
import { trip } from '../src/data.js';
import { getDayRouteSegments } from '../src/map.js';
import { renderBreakfastGuide } from '../src/breakfast-guides.js';

it('routes hotel-to-lunch through the deck waypoints and keeps floor changes explicit', () => {
  const segment = getDayRouteSegments(trip.days[0]).find(segment => segment.toId === 'd1-lunch');
  expect(segment.fromId).toBe('d1-hotel');
  expect(segment.mode).toBe('walk');
  expect(segment.coordinates).toEqual([hotelLucuaRoute.hotel, ...hotelLucuaRoute.waypoints, hotelLucuaRoute.destination]);
  const html = renderDeckGuide();
  expect(html).toContain('5층에서 짐 보관 후 2층');
  expect(html).toContain('루쿠아 이레 2층 → B2');
  expect(html).toContain('data-map-stop="d1-lunch"');
});

it('bundles the official floor maps and a complete zoomable map for each stage', () => {
  expect(existsSync('public/images/guides/grand-green-south-2f.png')).toBe(true);
  expect(existsSync('public/images/guides/lucua-b2-izumo.png')).toBe(true);
  for (const [key, config] of Object.entries(walkingMaps)) {
    const svg = config.render(key + '-test');
    expect(svg).toContain(`viewBox="0 0 ${config.size.join(' ')}"`);
    expect(svg).toContain('<desc');
  }
  expect(walkingMaps['south-deck'].render()).toContain('marker-end=');
  expect(walkingMaps['izumo-floor'].render()).toContain('いづも');
});

it('shows the supplied special-menu photo only on the second-day Osaka breakfast', () => {
  expect(existsSync('public/images/breakfast/maison-verte-special-menu.png')).toBe(true);
  const day2 = renderBreakfastGuide('d2-breakfast');
  expect(day2).toContain('data-walking-map-open="breakfast-menu"');
  expect(day2).toContain('maison-verte-special-menu.png');
  expect(day2).toContain('추가 요금이 없다고');
  expect(renderBreakfastGuide('d3-breakfast')).not.toContain('maison-verte-special-menu.png');
});
