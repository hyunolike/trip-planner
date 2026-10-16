import { Button } from '@/components/ui';
import type { DayView } from '@/lib/trip/content';
import styles from './Sections.module.css';

/** 장소와 코스 가이드가 있는 스톱만 모아, 누르면 그 스톱의 상세와 가이드를 열고 그 자리로 간다. */
export function SightGuideIndex({ day }: { day: DayView }) {
  const stops = day.stops.filter((s) => s.guide && ['place', 'course'].includes(s.guide.kind));
  if (!stops.length) return null;

  function open(key: string) {
    const row = document.getElementById(`stop-${key}`);
    const detail = row?.querySelector<HTMLDetailsElement>('details[data-stop-detail]');
    if (detail) detail.open = true;
    const guide = document.getElementById(`guide-${key}`) as HTMLDetailsElement | null;
    if (guide) guide.open = true;
    (guide ?? row)?.scrollIntoView?.({ block: 'start' });
  }

  return (
    <section className={styles.group} aria-label="명소 가는 길">
      <h3 className={styles.groupTitle}>명소 가는 길</h3>
      <p className={styles.lead}>방문할 곳을 고르면 이동 순서와 방문 팁으로 바로 가요.</p>
      <div className={styles.links}>
        {stops.map((stop) => (
          <Button key={stop.key} size="sm" variant="secondary" data-stop-key={stop.key} onClick={() => open(stop.key)}>
            {stop.title}
          </Button>
        ))}
      </div>
    </section>
  );
}
