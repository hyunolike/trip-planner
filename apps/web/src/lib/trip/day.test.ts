import { describe, expect, it } from 'vitest';
import { initialDayIndex, todayIn } from './day';

const days = [{ date: '2026-10-21' }, { date: '2026-10-22' }, { date: '2026-10-23' }, { date: '2026-10-24' }];

describe('initialDayIndex', () => {
  it('uses a valid ?day= first', () => {
    expect(initialDayIndex(days, '3', '2026-10-22')).toBe(2);
    expect(initialDayIndex(days, ['4'], '2026-10-01')).toBe(3);
  });

  it('opens today during the trip and day 1 otherwise', () => {
    expect(initialDayIndex(days, undefined, '2026-10-23')).toBe(2);
    expect(initialDayIndex(days, undefined, '2026-11-01')).toBe(0);
  });

  it('ignores day numbers that do not exist', () => {
    expect(initialDayIndex(days, '0', '2026-10-01')).toBe(0);
    expect(initialDayIndex(days, '9', '2026-10-01')).toBe(0);
    expect(initialDayIndex(days, '2.5', '2026-10-01')).toBe(0);
    expect(initialDayIndex(days, 'abc', '2026-10-24')).toBe(3);
  });
});

describe('todayIn', () => {
  it('uses the trip time zone, not the server one', () => {
    const lateEveningInSeoulUtc = new Date('2026-10-20T16:30:00Z');
    expect(todayIn('Asia/Tokyo', lateEveningInSeoulUtc)).toBe('2026-10-21');
    expect(todayIn('UTC', lateEveningInSeoulUtc)).toBe('2026-10-20');
  });
});
