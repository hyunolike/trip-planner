import { osakaTrip } from '@test/fixtures/trip';
import { describe, expect, it } from 'vitest';
import { readTrip } from '@/lib/trip/content';
import { describeWeather, weatherTips } from './describe';
import { weatherPointForDay } from './point';

describe('weatherPointForDay', () => {
  const days = readTrip(osakaTrip()).days;

  it('averages the day stops on the ground and names the city', () => {
    const point = weatherPointForDay(days[1]!);
    expect(point?.label).toBe(days[1]!.city);
    const [lat, lng] = point!.coordinates;
    expect(lat).toBeGreaterThan(34.5);
    expect(lat).toBeLessThan(35.2);
    expect(lng).toBeGreaterThan(135.4);
    expect(lng).toBeLessThan(135.9);
  });

  it('leaves out airports and flights so day 1 is not pulled toward the sea', () => {
    const ground = days[0]!.stops.filter((s) => s.coordinates && !['airport', 'flight'].includes(s.type));
    const lat = ground.reduce((sum, s) => sum + s.coordinates![0], 0) / ground.length;
    expect(weatherPointForDay(days[0]!)?.coordinates[0]).toBeCloseTo(lat, 6);
  });

  it('has no point for a day without coordinates', () => {
    expect(
      weatherPointForDay({ ...days[0]!, stops: days[0]!.stops.map((s) => ({ ...s, coordinates: undefined })) }),
    ).toBeUndefined();
  });
});

describe('describeWeather and weatherTips', () => {
  it('names Open-Meteo weather codes', () => {
    expect(describeWeather(0)).toEqual({ label: '맑음', icon: 'weather-sun' });
    expect(describeWeather(2).label).toBe('구름 조금');
    expect(describeWeather(63)).toEqual({ label: '비', icon: 'weather-rain' });
    expect(describeWeather(75).label).toBe('눈');
    expect(describeWeather(95).label).toBe('뇌우');
    expect(describeWeather(undefined).label).toBe('날씨 정보 없음');
  });

  it('suggests rain gear and a jacket when needed', () => {
    const base = {
      date: '2026-10-21',
      status: 'ready',
      condition: 63,
      high: 22,
      low: 15,
      rainChance: 70,
      windSpeed: 4.3,
      checkedAt: '2026-10-16T00:00:00Z',
    };
    expect(weatherTips(base, '비')).toEqual([
      '우산이나 우비를 챙겨요. 실내에서 쉴 곳도 생각해 둬요.',
      '아침저녁용 겉옷을 챙겨요.',
    ]);
    expect(weatherTips({ ...base, rainChance: 10, low: 20 }, '맑음')).toEqual([]);
  });
});
