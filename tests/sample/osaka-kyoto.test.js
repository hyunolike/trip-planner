/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
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
