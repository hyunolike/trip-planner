export function todayIn(timezone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** ?day=N이 맞으면 그 날, 아니면 여행 중인 오늘, 아니면 첫날. */
export function initialDayIndex(days: { date: string }[], param: string | string[] | undefined, today: string): number {
  const raw = Array.isArray(param) ? param[0] : param;
  const n = Number(raw);
  if (raw !== undefined && Number.isInteger(n) && n >= 1 && n <= days.length) return n - 1;
  const index = days.findIndex((day) => day.date === today);
  return index >= 0 ? index : 0;
}
