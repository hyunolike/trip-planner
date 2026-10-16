import { danangTrip, osakaTrip } from '@test/fixtures/trip';
import { describe, expect, it } from 'vitest';
import { readTrip } from './content';
import { legacySectionsFor, sectionFromHash } from './sections';

describe('sectionFromHash', () => {
  it('maps known hashes and falls back to the itinerary', () => {
    expect(sectionFromHash('#food')).toBe('food');
    expect(sectionFromHash('#preparation')).toBe('preparation');
    expect(sectionFromHash('')).toBe('itinerary');
    expect(sectionFromHash('#stop-d1-kix')).toBe('itinerary');
  });
});

describe('legacySectionsFor', () => {
  const osaka = readTrip(osakaTrip());

  it('hides legacy tabs that structured data already covers', () => {
    expect(legacySectionsFor(osaka, 'food')).toEqual([]);
    expect(legacySectionsFor(osaka, 'shopping')).toEqual([]);
    expect(legacySectionsFor(osaka, 'links')).toEqual([]);
    expect(legacySectionsFor(osaka, 'preparation')).toEqual([]);
  });

  it('keeps sections without a tab under trip info', () => {
    expect(legacySectionsFor(osaka, 'info').map((s) => s.id)).toEqual(['overview', 'airport']);
  });

  it('shows a legacy tab when the structured data for it is empty', () => {
    const doc = osakaTrip();
    doc.places = doc.places.filter((p) => p.kind !== 'dining');
    expect(legacySectionsFor(readTrip(doc), 'food').map((s) => s.id)).toEqual(['food']);
    expect(legacySectionsFor(readTrip(danangTrip()), 'info')).toEqual([]);
  });
});
