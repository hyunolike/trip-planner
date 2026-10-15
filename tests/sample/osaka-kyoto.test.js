/** @vitest-environment node */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { trip } from '../../src/data.js';
import { validateTrip } from '../../scripts/sample/validate.mjs';
import { KNOWN_DAY_KEYS, KNOWN_STOP_KEYS, KNOWN_TRIP_KEYS, KNOWN_TOUR_KEYS, SLUG, buildOsakaKyotoTrip, toPhoto } from '../../scripts/sample/osaka-kyoto.mjs';

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
    expect(Object.keys(trip).filter((key) => !KNOWN_TRIP_KEYS.includes(key))).toEqual([]);
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

  const RESTAURANT_ALIASES = { '이즈모우나기 루쿠아점': 'izumo' };
  const restaurantStops = trip.days.flatMap((day) => day.stops).filter((stop) => stop.restaurant);

  it('merges stop restaurants into existing dining places and creates meal places only for the rest', () => {
    const diningIds = new Set(osakaDining.map((item) => item.id));
    const diningByName = new Map(osakaDining.map((item) => [item.name, item.id]));
    for (const stop of restaurantStops) {
      const mapped = stops.find((s) => s.id === stop.id);
      const existingId = diningByName.get(stop.restaurant.name) ?? RESTAURANT_ALIASES[stop.restaurant.name];
      if (existingId) expect(mapped.placeId).toBe(existingId);
      else expect(mapped.placeId).toBe(`meal-${stop.id}`);
    }
    const mealPlaces = out.places.filter((place) => place.id.startsWith('meal-'));
    const mealNames = restaurantStops.map((stop) => stop.restaurant.name).filter((name) => !diningByName.has(name) && !RESTAURANT_ALIASES[name]);
    expect(mealPlaces.map((place) => place.name).sort()).toEqual([...new Set(mealNames)].sort());
    expect(diningIds.has('izumo') && diningIds.has('bonkuraya-plus')).toBe(true);
  });

  it('keeps place names unique and every restaurant stop pointing at the matching place', () => {
    const names = out.places.map((place) => place.name);
    expect(names.length).toBe(new Set(names).size);
    for (const stop of restaurantStops) {
      const place = out.places.find((p) => p.id === stops.find((s) => s.id === stop.id).placeId);
      const expectedIds = [RESTAURANT_ALIASES[stop.restaurant.name]].filter(Boolean);
      expect(place.name === stop.restaurant.name || expectedIds.includes(place.id)).toBe(true);
    }
  });

  it('merges restaurant-only fields into the dining place without overwriting', () => {
    const find = (id) => out.places.find((p) => p.id === id);
    const izumoSrc = osakaDining.find((d) => d.id === 'izumo');
    const lunch = trip.days[0].stops.find((s) => s.id === 'd1-lunch').restaurant;
    const izumo = find('izumo');
    expect(izumo.name).toBe(izumoSrc.name);
    expect(izumo.menu).toBe(izumoSrc.menu);
    expect(izumo.alternatives).toEqual(lunch.alternatives);
    expect(izumo.note).toContain(izumoSrc.note);
    expect(izumo.note).toContain(lunch.note);
    expect(izumo.sources.map((s) => s.url)).toContain(lunch.link.url);
    const bonkuraya = find('bonkuraya-plus');
    const dinner = trip.days[0].stops.find((s) => s.id === 'd1-dinner').restaurant;
    expect(bonkuraya.note).toContain(dinner.note);
    expect(bonkuraya.sources.map((s) => s.url).filter((url) => url === dinner.link.url)).toHaveLength(1);
  });

  it('uses region labels for area, never a stop title', () => {
    const titles = new Set(trip.days.flatMap((day) => day.stops.map((stop) => stop.title)));
    for (const place of out.places) expect(titles.has(place.area)).toBe(false);
    const meal = out.places.filter((place) => place.id.startsWith('meal-'));
    expect(meal.length).toBeGreaterThan(0);
    for (const place of meal) expect(['오사카', '교토', '교토 북부', '교토 · 간사이공항']).toContain(place.area);
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
