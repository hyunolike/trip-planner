/** @vitest-environment jsdom */
import { expect, it } from 'vitest';
import { getTripCountdown, renderTripCountdown, updateTripCountdown } from '../src/countdown.js';
import { trip } from '../src/data.js';

it('counts to the flight departure in Korean time regardless of the host timezone', () => {
  const state = getTripCountdown(trip, Date.parse('2026-10-20T23:10:00+09:00'));
  expect(state).toMatchObject({ phase: 'upcoming', days: 0, hours: 9, minutes: 0, seconds: 0 });
  expect(getTripCountdown(trip, Date.parse('2026-10-12T22:27:22+09:00'))).toMatchObject({ days: 8, hours: 9, minutes: 42, seconds: 38 });
});

it('switches to the return arrival at departure and stops at the end of the trip', () => {
  expect(getTripCountdown(trip, Date.parse('2026-10-21T08:10:00+09:00')).phase).toBe('travelling');
  expect(getTripCountdown(trip, Date.parse('2026-10-24T22:24:59+09:00'))).toMatchObject({ phase: 'travelling', seconds: 1 });
  expect(getTripCountdown(trip, Date.parse('2026-10-24T22:25:00+09:00'))).toMatchObject({ phase: 'finished', days: 0, hours: 0, minutes: 0, seconds: 0 });
});

it('recomputes from the current clock after a tab resumes without announcing each second', () => {
  document.body.innerHTML = renderTripCountdown(trip);
  updateTripCountdown(document, trip, Date.parse('2026-10-21T08:09:59+09:00'));
  expect(document.querySelector('[data-countdown-unit="seconds"]').textContent).toBe('01');
  updateTripCountdown(document, trip, Date.parse('2026-10-24T22:25:00+09:00'));
  expect(document.querySelector('.trip-countdown').dataset.phase).toBe('finished');
  expect(document.querySelector('.countdown-clock').hidden).toBe(true);
  expect(document.querySelector('.countdown-finished').hidden).toBe(false);
  expect(document.querySelector('[role="timer"]').getAttribute('aria-live')).toBe('off');
});
