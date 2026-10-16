/** @vitest-environment node */
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { airportGuide, trip } from '../../src/data.js';
import { createGoogleMapsUrl } from '../../src/map.js';
import { renderApp } from '../../src/render.js';
import { buildOsakaKyotoTripFull } from '../../scripts/sample/osaka-kyoto.mjs';

const STATE = { completedStops: [], completedPreparation: [], day4Option: 'slow-kyoto' };
const VIEWS = ['itinerary', 'food', 'shopping', 'links', 'preparation'];
const APP_CHROME = ['/icons/', '/illustrations/', '/fonts/', '/manifest', '/images/brand/'];

function urlsIn(html) {
  const document = new JSDOM(html).window.document;
  return [...document.querySelectorAll('[href], [src]')]
    .map((element) => element.getAttribute('href') ?? element.getAttribute('src'))
    .filter((url) => url && !url.startsWith('#') && !url.startsWith('data:') && !url.startsWith('javascript:'))
    .filter((url) => !APP_CHROME.some((prefix) => url.startsWith(prefix)));
}

function legacyUrls() {
  const urls = new Set();
  trip.days.forEach((_, dayIndex) => {
    for (const view of VIEWS) {
      const html = renderApp(trip, airportGuide, dayIndex, STATE, true, true, false, 'other', false, view, 'detail');
      urlsIn(html).forEach((url) => urls.add(url));
    }
  });
  return urls;
}

function isDerivedFromCoordinates(url) {
  if (url.startsWith('https://www.google.com/maps/dir/?')) return true;
  return trip.days.some((day) => day.stops.some((stop) => stop.coordinates && createGoogleMapsUrl(stop.coordinates) === url));
}

function urlsInTrip(value, urls = new Set()) {
  if (typeof value === 'string') {
    if (/^(https?:\/\/|\/)/.test(value)) urls.add(value);
    if (value.includes('<')) urlsIn(value).forEach((url) => urls.add(url));
  } else if (Array.isArray(value)) {
    value.forEach((item) => urlsInTrip(item, urls));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => urlsInTrip(item, urls));
  }
  return urls;
}

describe('Osaka Kyoto export coverage', () => {
  it('keeps every link and image the legacy app renders', () => {
    const exported = urlsInTrip(buildOsakaKyotoTripFull());
    const missing = [...legacyUrls()].filter((url) => !exported.has(url) && !isDerivedFromCoordinates(url));
    expect(missing).toEqual([]);
  });

  it('is deterministic', () => {
    expect(JSON.stringify(buildOsakaKyotoTripFull())).toBe(JSON.stringify(buildOsakaKyotoTripFull()));
  });

  it('matches the committed JSON file', () => {
    const committed = readFileSync(new URL('../../sample/osaka-kyoto-family-2026.json', import.meta.url), 'utf8');
    expect(committed).toBe(`${JSON.stringify(buildOsakaKyotoTripFull(), null, 2)}\n`);
  });
});
