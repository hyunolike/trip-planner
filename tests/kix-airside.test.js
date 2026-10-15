/** @vitest-environment jsdom */
import { expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderDay } from '../src/render.js';
import { trip } from '../src/data.js';
import { transitMaps } from '../src/transit-guides.js';

it('adds international airside dining, sourced shopping photos and a complete zoomable map on the return day', () => {
  const day = trip.days[3];
  document.body.innerHTML = renderDay(day, { completedStops: [], day4Option: null });
  expect(document.querySelector('[data-transit-map-open="airside"]')).not.toBeNull();
  expect(transitMaps.airside.size).toEqual([1600, 1550]);
  expect(document.body.textContent).toContain('19·20번 게이트 사이');
  expect(document.body.textContent).toContain('2026.6.2');
  expect(document.body.textContent).toContain('BEST SELLER');
  expect(document.body.textContent).toContain('리큐르');
  expect(document.body.textContent).toContain('중앙 기존 구역의 개별 점포 위치');
  const imgs = [...document.querySelectorAll('.airside-photo img')];
  expect(imgs).toHaveLength(5);
  for (const img of imgs) {
    expect(img.alt.length).toBeGreaterThan(5);
    expect(existsSync(resolve(process.cwd(), `public${img.getAttribute('src')}`))).toBe(true);
  }
  for (const image of document.querySelectorAll('[data-transit-map-open="airside"] image')) {
    expect(existsSync(resolve(process.cwd(), `public${image.getAttribute('href')}`))).toBe(true);
  }
  const ids = day.stops.map(stop => stop.id);
  expect(ids.indexOf('d4-kix')).toBeLessThan(ids.indexOf('d4-dinner'));
  expect(ids.indexOf('d4-dinner')).toBeLessThan(ids.indexOf('d4-shopping'));
  expect(ids.indexOf('d4-shopping')).toBeLessThan(ids.indexOf('d4-flight'));
  expect(day.stops.find(stop => stop.id === 'd4-shopping').details).toContain('쇼핑은 생략');
});
