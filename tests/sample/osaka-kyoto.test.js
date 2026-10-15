/** @vitest-environment node */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { trip } from '../../src/data.js';
import { validateTrip } from '../../scripts/sample/validate.mjs';
import { KNOWN_DAY_KEYS, KNOWN_STOP_KEYS, KNOWN_TOUR_KEYS, SLUG, buildOsakaKyotoTrip, toPhoto } from '../../scripts/sample/osaka-kyoto.mjs';

describe('buildOsakaKyotoTrip', () => {
  const out = buildOsakaKyotoTrip();

  it('produces a schema-valid trip', () => {
    expect(validateTrip(out)).toEqual({ ok: true, errors: [] });
  });

  it('keeps identity and visibility from the spec', () => {
    expect(out).toMatchObject({ slug: SLUG, visibility: 'link', isSample: false, startDate: '2026-10-21', endDate: '2026-10-24', timezone: 'Asia/Tokyo' });
    expect(out.provenance.kind).toBe('family-original');
  });

  it('keeps all 4 days and 50 stops in order', () => {
    expect(out.days.map((day) => day.stops.length)).toEqual(trip.days.map((day) => day.stops.length));
    expect(out.days.flatMap((day) => day.stops.map((stop) => stop.id))).toEqual(trip.days.flatMap((day) => day.stops.map((stop) => stop.id)));
    expect(out.days.flatMap((day) => day.stops)).toHaveLength(50);
  });

  it('keeps stop text unchanged', () => {
    const source = trip.days.flatMap((day) => day.stops);
    const mapped = out.days.flatMap((day) => day.stops);
    source.forEach((stop, index) => {
      expect(mapped[index]).toMatchObject({ time: stop.time, title: stop.title, type: stop.type, details: stop.details });
      if (stop.buffer) expect(mapped[index].buffer).toBe(stop.buffer);
      if (stop.timing) expect(mapped[index].timing).toBe(stop.timing);
      if (stop.transport) expect(mapped[index].transportIcon).toBe(stop.transport);
    });
  });

  it('converts flight dates to ISO dates', () => {
    expect(out.flights).toEqual([
      expect.objectContaining({ direction: 'outbound', from: 'GMP', to: 'KIX', date: '2026-10-21', depart: '08:10' }),
      expect.objectContaining({ direction: 'return', from: 'KIX', to: 'GMP', date: '2026-10-24', depart: '20:30' }),
    ]);
  });

  it('maps the day tour without dropping fields', () => {
    const sourceDay = trip.days.find((day) => day.tour);
    const mappedDay = out.days[sourceDay.number - 1];
    expect(mappedDay.tour.title).toBe(sourceDay.tour.title);
    expect(mappedDay.tour.provider).toBe(sourceDay.tour.seller);
    expect(mappedDay.tour.fees).toHaveLength(sourceDay.tour.fees.length);
    expect(mappedDay.tour.feeNote).toBe(sourceDay.tour.feeNote);
  });

  it('renames photo.source to sourceUrl', () => {
    expect(toPhoto({ src: '/a.webp', alt: 'a', source: 'https://example.com/a' })).toEqual({ src: '/a.webp', alt: 'a', sourceUrl: 'https://example.com/a' });
  });

  it('knows every key used in the original data', () => {
    const stopKeys = new Set(trip.days.flatMap((day) => day.stops.flatMap((stop) => Object.keys(stop))));
    const dayKeys = new Set(trip.days.flatMap((day) => Object.keys(day)));
    const tourKeys = new Set(trip.days.filter((day) => day.tour).flatMap((day) => Object.keys(day.tour)));
    expect([...stopKeys].filter((key) => !KNOWN_STOP_KEYS.includes(key))).toEqual([]);
    expect([...dayKeys].filter((key) => !KNOWN_DAY_KEYS.includes(key))).toEqual([]);
    expect([...tourKeys].filter((key) => !KNOWN_TOUR_KEYS.includes(key))).toEqual([]);
  });
});

import { osakaDining, osakaShopping, kyotoShopping } from '../../src/data.js';
import { placeGuides } from '../../src/place-guides.js';
import { preparationGroups } from '../../src/preparation.js';
import { buildOsakaKyotoTripFull } from '../../scripts/sample/osaka-kyoto.mjs';

describe('buildOsakaKyotoTripFull', () => {
  const out = buildOsakaKyotoTripFull();
  const stops = out.days.flatMap((day) => day.stops);

  it('is schema-valid', () => {
    expect(validateTrip(out)).toEqual({ ok: true, errors: [] });
  });

  it('includes every dining and shopping candidate as a place', () => {
    const ids = out.places.map((place) => place.id);
    for (const item of [...osakaDining, ...osakaShopping, ...kyotoShopping]) expect(ids).toContain(item.id);
  });

  it('turns stop restaurants into dining places without duplicates', () => {
    const sourceNames = new Set(trip.days.flatMap((day) => day.stops).filter((stop) => stop.restaurant).map((stop) => stop.restaurant.name));
    const mealPlaces = out.places.filter((place) => place.id.startsWith('meal-'));
    expect(mealPlaces.map((place) => place.name).sort()).toEqual([...sourceNames].sort());
    for (const stop of trip.days.flatMap((day) => day.stops).filter((s) => s.restaurant)) {
      const mapped = stops.find((s) => s.id === stop.id);
      expect(mapped.placeId).toBeTruthy();
      expect(out.places.find((place) => place.id === mapped.placeId).name).toBe(stop.restaurant.name);
    }
  });

  it('turns place guides into structured blocks', () => {
    for (const stopId of Object.keys(placeGuides)) {
      const guide = stops.find((stop) => stop.id === stopId).guide;
      expect(guide.kind).toBe('place');
      expect(guide.blocks.find((block) => block.type === 'steps').items).toEqual(placeGuides[stopId].steps);
    }
  });

  it('keeps hotel, breakfast and transit guides as html blocks', () => {
    const htmlTitles = stops.flatMap((stop) => stop.guide?.blocks.filter((block) => block.type === 'html').map((block) => block.title) ?? []);
    expect(htmlTitles).toEqual(expect.arrayContaining(['숙소 안내', '조식 안내', '이동 안내']));
  });

  it('maps every checklist item with its priority', () => {
    expect(out.checklistGroups.map((group) => group.items.length)).toEqual(preparationGroups.map((group) => group.items.length));
    expect(out.checklistGroups[0].items[0]).toEqual({ id: 'passports', priority: '필수', title: '가족 3명 여권 원본', description: preparationGroups[0].items[0][3] });
  });

  it('keeps the legacy screens as sections', () => {
    expect(out.sections.map((section) => section.id)).toEqual(['overview', 'airport', 'food', 'shopping', 'links', 'preparation']);
    for (const section of out.sections) {
      expect(section.legacy).toBe(true);
      expect(section.blocks[0].html.length).toBeGreaterThan(200);
    }
  });

  describe('determinism', () => {
    afterEach(() => vi.useRealTimers());

    it('does not depend on the current time', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      const first = JSON.stringify(buildOsakaKyotoTripFull());
      vi.setSystemTime(new Date('2026-12-31T12:00:00Z'));
      const second = JSON.stringify(buildOsakaKyotoTripFull());
      expect(second).toBe(first);
      expect(first).not.toContain('trip-countdown');
    });
  });
});
