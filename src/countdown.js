const zoneOffset = '+09:00';

export function getTripCountdown(trip, now = Date.now()) {
  const departure = Date.parse(`${trip.days[0].date}T${trip.flights.outbound.depart}:00${zoneOffset}`);
  const arrival = Date.parse(`${trip.days.at(-1).date}T${trip.flights.return.arrive}:00${zoneOffset}`);
  const phase = now < departure ? 'upcoming' : now < arrival ? 'travelling' : 'finished';
  const seconds = Math.max(0, Math.ceil(((phase === 'upcoming' ? departure : arrival) - now) / 1000));
  return {
    phase,
    label: phase === 'upcoming' ? '출발까지' : phase === 'travelling' ? '가족여행 중 · 귀국까지' : '여행 종료',
    days: Math.floor(seconds / 86400),
    hours: Math.floor(seconds / 3600) % 24,
    minutes: Math.floor(seconds / 60) % 60,
    seconds: seconds % 60,
  };
}

export function renderTripCountdown(trip) {
  const state = getTripCountdown(trip);
  return `<section class="trip-countdown" data-phase="${state.phase}" aria-label="여행 출발 시간"><div class="countdown-copy"><p data-countdown-label>${state.label}</p><small>10월 21일 08:10 김포 출발 · 한국·일본 시간 기준</small></div><div class="countdown-clock" role="timer" aria-live="off" aria-label="${state.label}" ${state.phase === 'finished' ? 'hidden' : ''}>${[['days', '일'], ['hours', '시간'], ['minutes', '분'], ['seconds', '초']].map(([key, unit]) => `<span><b data-countdown-unit="${key}">${String(state[key]).padStart(2, '0')}</b><small>${unit}</small></span>`).join('')}</div><p class="countdown-finished" ${state.phase === 'finished' ? '' : 'hidden'}>여행 일정과 방문 기록을 확인할 수 있어요.</p></section>`;
}

export function updateTripCountdown(root, trip, now = Date.now()) {
  const container = root?.matches?.('.trip-countdown') ? root : root?.querySelector('.trip-countdown');
  if (!container) return;
  const state = getTripCountdown(trip, now);
  container.dataset.phase = state.phase;
  const label = container.querySelector('[data-countdown-label]');
  const clock = container.querySelector('.countdown-clock');
  if (!label || !clock) return;
  if (label.textContent !== state.label) label.textContent = state.label;
  clock.setAttribute('aria-label', `${state.label} ${state.days}일 ${state.hours}시간 ${state.minutes}분 ${state.seconds}초`);
  clock.hidden = state.phase === 'finished';
  container.querySelector('.countdown-finished').hidden = state.phase !== 'finished';
  container.querySelectorAll('[data-countdown-unit]').forEach(element => {
    const value = String(state[element.dataset.countdownUnit]).padStart(2, '0');
    if (element.textContent !== value) element.textContent = value;
  });
}
