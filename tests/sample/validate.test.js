/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { semanticErrors, validateTrip } from '../../scripts/sample/validate.mjs';

const stop = (id, time) => ({ id, time, title: id, type: 'sight', details: 'd' });
const base = () => ({
  schemaVersion: 1,
  slug: 'test-trip',
  title: '테스트 여행',
  startDate: '2027-03-03',
  endDate: '2027-03-04',
  visibility: 'public',
  isSample: true,
  days: [
    { number: 1, date: '2027-03-03', city: 'DANANG', theme: '도착', stops: [stop('d1-a', '09:00'), stop('d1-b', '10:00')] },
    { number: 2, date: '2027-03-04', city: 'HOI AN', theme: '올드타운', stops: [stop('d2-a', '08:00')] },
  ],
  provenance: { kind: 'researched-example', createdAt: '2026-10-16' },
});

describe('validateTrip', () => {
  it('accepts a minimal valid trip', () => {
    expect(validateTrip(base())).toEqual({ ok: true, errors: [] });
  });

  it('rejects unknown properties with the JSON path', () => {
    const trip = base();
    trip.days[0].stops[0].colour = 'red';
    const result = validateTrip(trip);
    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('/days/0/stops/0');
  });

  it('rejects a time that is not HH:MM', () => {
    const trip = base();
    trip.days[0].stops[0].time = '9:00';
    expect(validateTrip(trip).ok).toBe(false);
  });
});

describe('semanticErrors', () => {
  it('reports a day whose date does not follow the start date', () => {
    const trip = base();
    trip.days[1].date = '2027-03-05';
    expect(semanticErrors(trip)).toContain('day 2: date 2027-03-05 should be 2027-03-04');
  });

  it('reports stops that go backwards in time within a day', () => {
    const trip = base();
    trip.days[0].stops[1].time = '08:30';
    expect(semanticErrors(trip)).toContain('day 1: d1-b at 08:30 is earlier than 09:00');
  });

  it('reports duplicate stop ids across days', () => {
    const trip = base();
    trip.days[1].stops[0].id = 'd1-a';
    expect(semanticErrors(trip)).toContain('duplicate stop id d1-a');
  });

  it('reports day numbers that skip', () => {
    const trip = base();
    trip.days[1].number = 3;
    expect(semanticErrors(trip)).toContain('day 2: number is 3');
  });

  it('reports a day after the end date', () => {
    const trip = base();
    trip.endDate = '2027-03-03';
    expect(semanticErrors(trip)).toContain('day 2: 2027-03-04 is after endDate 2027-03-03');
  });

  it('reports a stop that points to a missing place', () => {
    const trip = base();
    trip.places = [{ id: 'pho-1', kind: 'dining', name: '퍼', area: '다낭' }];
    trip.days[0].stops[0].placeId = 'pho-2';
    expect(semanticErrors(trip)).toContain('d1-a: placeId pho-2 does not exist');
  });

  it('reports duplicate place ids', () => {
    const trip = base();
    trip.places = [
      { id: 'pho-1', kind: 'dining', name: '퍼', area: '다낭' },
      { id: 'pho-1', kind: 'dining', name: '퍼2', area: '다낭' },
    ];
    expect(semanticErrors(trip)).toContain('duplicate place id pho-1');
  });
});
