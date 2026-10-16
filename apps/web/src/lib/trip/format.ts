import type { IconName } from '@/components/ui/icons.generated';
import type { StopView } from './content';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const pad = (n: number) => String(n).padStart(2, '0');
const parts = (iso: string) => iso.split('-').map(Number) as [number, number, number];
const utc = (iso: string) => {
  const [y, m, d] = parts(iso);
  return Date.UTC(y, m - 1, d);
};

export function formatDayDate(iso: string): string {
  const [, m, d] = parts(iso);
  return `${pad(m)}.${pad(d)} ${WEEKDAYS[new Date(utc(iso)).getUTCDay()]}`;
}

export function formatDateRange(start: string, end: string): string {
  const [sy, sm, sd] = parts(start);
  const [ey, em, ed] = parts(end);
  const head = `${sy}.${pad(sm)}.${pad(sd)}`;
  if (start === end) return head;
  return sy === ey ? `${head} – ${pad(em)}.${pad(ed)}` : `${head} – ${ey}.${pad(em)}.${pad(ed)}`;
}

/** 'N박'은 밤 비행이 끼면 날짜만으로 알 수 없다(다낭 샘플은 3박 5일). 날짜로 확실한 'N일'만 쓴다. */
export function tripLength(start: string, end: string): string {
  const days = Math.round((utc(end) - utc(start)) / 86_400_000) + 1;
  return days <= 1 ? '당일' : `${days}일`;
}

const TYPE_LABELS: Record<string, string> = {
  airport: '공항',
  flight: '항공',
  transport: '이동',
  hotel: '숙소',
  meal: '식사',
  breakfast: '조식',
  sight: '관광',
  tour: '투어',
  shopping: '쇼핑',
  bath: '온천',
  free: '자유',
};

export const stopTypeLabel = (type: string) => TYPE_LABELS[type] ?? '일정';

const TRANSIT_ICONS: Record<string, IconName> = {
  flight: 'type-flight',
  train: 'type-train',
  cablecar: 'type-train',
  bus: 'type-bus',
  walk: 'type-walk',
  boat: 'type-boat',
  taxi: 'type-taxi',
  car: 'type-taxi',
};

export const transitIcon = (mode: string): IconName => TRANSIT_ICONS[mode] ?? 'route';

const TYPE_ICONS: Record<string, IconName> = {
  airport: 'type-airport',
  flight: 'type-flight',
  hotel: 'type-hotel',
  meal: 'type-meal',
  breakfast: 'type-meal',
  sight: 'type-sight',
  tour: 'type-sight',
  shopping: 'type-shopping',
  bath: 'type-free',
  free: 'type-free',
};

export function stopIcon(stop: Pick<StopView, 'type' | 'transit'>): IconName {
  if (stop.type === 'transport') return stop.transit ? transitIcon(stop.transit.mode) : 'route';
  return TYPE_ICONS[stop.type] ?? 'map-pin';
}
