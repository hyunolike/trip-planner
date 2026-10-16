import { Disclosure } from '@/components/ui';
import type { TripView } from '@/lib/trip/content';
import { formatDayDate } from '@/lib/trip/format';
import { legacySectionsFor } from '@/lib/trip/sections';
import { GuideBlocks } from './GuideBlocks';
import styles from './Sections.module.css';

const DIRECTION: Record<string, string> = { outbound: '가는 편', return: '오는 편' };

export function TripInfo({ trip }: { trip: TripView }) {
  const legacy = legacySectionsFor(trip, 'info');
  const { flights, route } = trip.content;
  if (!legacy.length && !flights.length && !route.length) return null;
  return (
    <section className={styles.info} aria-label="여행 전체 안내">
      <h2 className={styles.title}>여행 전체 안내</h2>
      {flights.length || route.length ? (
        <Disclosure summary="항공편과 이동 경로">
          <ul className={styles.flights}>
            {flights.map((f) => (
              <li key={`${f.direction}-${f.date}`}>
                {DIRECTION[f.direction] ?? f.direction} · {formatDayDate(f.date)} · {f.airline ? `${f.airline} · ` : ''}
                <span className={styles.code}>
                  {f.from} {f.depart} → {f.to} {f.arrive}
                </span>
              </li>
            ))}
          </ul>
          {route.length ? <p className={styles.lead}>{route.map((r) => r.label).join(' → ')}</p> : null}
        </Disclosure>
      ) : null}
      {legacy.map((section) => (
        <Disclosure key={section.id} summary={section.title}>
          <GuideBlocks blocks={section.blocks} headingLevel={3} />
        </Disclosure>
      ))}
    </section>
  );
}
