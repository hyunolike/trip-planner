import Link from 'next/link';
import { Badge } from '@/components/ui';
import { readSummaryCover, type TripSummary } from '@/lib/trip/content';
import { formatDateRange, tripLength } from '@/lib/trip/format';
import styles from './TripCard.module.css';

export function TripCard({ trip }: { trip: TripSummary }) {
  const cover = readSummaryCover(trip);
  return (
    <Link href={`/t/${trip.slug}`} className={styles.card}>
      <div className={styles.cover}>
        {/* biome-ignore lint/performance/noImgElement: 표지는 외부 출처 사진이라 next/image 원격 설정 전까지 img를 쓴다 */}
        <img
          src={cover?.src ?? '/ds/illustrations/hero-route.svg'}
          alt={cover?.alt ?? ''}
          width={640}
          height={360}
          loading="lazy"
        />
      </div>
      <div className={styles.body}>
        <h3 className={styles.title}>{trip.title}</h3>
        <span className={styles.dates}>
          {formatDateRange(trip.startDate, trip.endDate)} · {tripLength(trip.startDate, trip.endDate)}
        </span>
        <p className={styles.subtitle}>{trip.subtitle ?? trip.cities.slice(0, 3).join(' · ')}</p>
        <div className={styles.foot}>
          <span>스톱 {trip.stopCount}개</span>
          {trip.isSample ? <Badge tone="brand">샘플</Badge> : null}
        </div>
      </div>
    </Link>
  );
}
