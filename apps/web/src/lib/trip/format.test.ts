import { describe, expect, it } from 'vitest';
import { formatDateRange, formatDayDate, stopIcon, stopTypeLabel, transitIcon, tripLength } from './format';

describe('dates', () => {
  it('formats a day as month.day and weekday', () => {
    expect(formatDayDate('2026-10-21')).toBe('10.21 수');
    expect(formatDayDate('2027-03-01')).toBe('03.01 월');
  });

  it('formats a range and the trip length', () => {
    expect(formatDateRange('2026-10-21', '2026-10-24')).toBe('2026.10.21 – 10.24');
    expect(formatDateRange('2026-12-30', '2027-01-02')).toBe('2026.12.30 – 2027.01.02');
    expect(formatDateRange('2026-10-21', '2026-10-21')).toBe('2026.10.21');
    expect(tripLength('2026-10-21', '2026-10-24')).toBe('4일');
    expect(tripLength('2027-03-03', '2027-03-07')).toBe('5일');
    expect(tripLength('2026-10-21', '2026-10-21')).toBe('당일');
  });
});

describe('stop labels and icons', () => {
  it('names every stop type the samples use', () => {
    for (const type of [
      'airport',
      'flight',
      'transport',
      'hotel',
      'meal',
      'breakfast',
      'sight',
      'tour',
      'shopping',
      'bath',
      'free',
    ]) {
      expect(stopTypeLabel(type)).not.toBe('일정');
    }
    expect(stopTypeLabel('unknown')).toBe('일정');
  });

  it('draws transport stops with their transit mode icon', () => {
    expect(stopIcon({ type: 'transport', transit: { mode: 'train', label: 'JR', waypoints: [] } })).toBe('type-train');
    expect(stopIcon({ type: 'transport', transit: undefined })).toBe('route');
    expect(stopIcon({ type: 'meal', transit: undefined })).toBe('type-meal');
    expect(transitIcon('car')).toBe('type-taxi');
    expect(transitIcon('cablecar')).toBe('type-train');
  });
});
