/** @vitest-environment jsdom */
import { expect, it, vi } from 'vitest';
import { trip } from '../src/data.js';
import { describeWeather, getForecastUrl, getWeatherLocationsForDay, parseForecast, refreshWeather, renderDayWeather, updateWeatherCards } from '../src/weather.js';

const payload = (rain = 0) => ({ daily: {
  time: ['2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24'],
  weather_code: [0, 3, 61, 2],
  temperature_2m_max: [23, 24, 21, 22],
  temperature_2m_min: [15, 16, 14, 16],
  precipitation_probability_max: [rain, null, 80, 20],
  wind_speed_10m_max: [2, 3, 5, 2],
} });

it('uses local dates and separates the coast tour from Kyoto city', () => {
  const url = new URL(getForecastUrl('kyoto'));
  expect(url.searchParams.get('timezone')).toBe('Asia/Tokyo');
  expect(url.searchParams.get('forecast_days')).toBe('16');
  expect(url.searchParams.get('wind_speed_unit')).toBe('ms');
  expect(getWeatherLocationsForDay(trip.days[0])).toEqual(['osaka']);
  expect(getWeatherLocationsForDay(trip.days[2])).toEqual(['amanohashidate', 'ine']);
  expect(describeWeather(97).label).toBe('뇌우');
});

it('matches forecast values by date and preserves null and zero values', () => {
  const days = parseForecast(payload());
  expect(days.get('2026-10-21').rain).toBe(0);
  expect(days.get('2026-10-22').rain).toBeNull();
  expect(days.get('2026-10-23').high).toBe(21);
  expect(days.get('2030-01-01')).toBeUndefined();
  expect(() => parseForecast({ error: true })).toThrow();
});

it('keeps successful cities when one fails, then recovers and retains old data if a refresh fails', async () => {
  const fetcher = vi.fn(async url => ({ ok: !url.includes('latitude=35.6765'), json: async () => payload() }));
  await refreshWeather(() => {}, { force: true, fetcher });
  expect(renderDayWeather(trip.days[0])).toContain('0%');
  expect(renderDayWeather(trip.days[1])).toContain('제공 없음');
  expect(renderDayWeather(trip.days[2])).toContain('날씨를 가져오지 못했어요');
  const recovering = vi.fn(async () => ({ ok: true, json: async () => payload(50) }));
  await refreshWeather(() => {}, { force: true, fetcher: recovering });
  document.body.innerHTML = renderDayWeather(trip.days[0]);
  updateWeatherCards(document, trip);
  expect(document.body.textContent).toContain('50%');
  expect(document.querySelector('[data-weather-refresh]').disabled).toBe(false);
  await refreshWeather(() => {}, { force: true, fetcher: vi.fn(async () => { throw new Error('offline'); }) });
  expect(renderDayWeather(trip.days[0])).toContain('50%');
  expect(renderDayWeather(trip.days[0])).toContain('갱신 실패, 이전 예보');
});

it('does not fetch again within the thirty-minute interval', async () => {
  const fetcher = vi.fn(async () => ({ ok: true, json: async () => payload() }));
  await refreshWeather(() => {}, { force: true, fetcher });
  fetcher.mockClear();
  await refreshWeather(() => {}, { fetcher });
  expect(fetcher).not.toHaveBeenCalled();
});
