import Link from 'next/link';
import { Badge } from '@/components/ui';
import type { TripView } from '@/lib/trip/content';
import { formatDateRange, tripLength } from '@/lib/trip/format';
import styles from './TripHeader.module.css';

export function TripHeader({ trip }: { trip: TripView }) {
  const readOnly = !trip.permissions.canEdit;
  const researched = trip.content.provenance?.kind === 'researched-example';
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} aria-label="여행노트 홈">
          {/* biome-ignore lint/performance/noImgElement: 로고 SVG */}
          <img src="/brand/lockup-horizontal.svg" alt="" width={120} height={28} />
        </Link>
        <h1 className={styles.title}>{trip.title}</h1>
        {trip.subtitle ? <p className={styles.subtitle}>{trip.subtitle}</p> : null}
        <span className={styles.dates}>
          {formatDateRange(trip.startDate, trip.endDate)} · {tripLength(trip.startDate, trip.endDate)}
        </span>
        {trip.content.travelers.length ? (
          <ul className={styles.travelers} aria-label="함께 가는 사람">
            {trip.content.travelers.map((t) => (
              <li key={t.label}>
                {t.emoji ? <span aria-hidden="true">{t.emoji} </span> : null}
                {t.label}
              </li>
            ))}
          </ul>
        ) : null}
        <div className={styles.notice}>
          {trip.isSample ? <Badge tone="brand">샘플 일정</Badge> : null}
          {readOnly ? <Badge>보기 전용</Badge> : null}
          {readOnly ? <p>복제해서 내 일정으로 만들기는 곧 열려요.</p> : null}
        </div>
        {researched ? (
          <p className={styles.notice}>
            여러 여행 상품을 참고해 새로 짠 예시 일정이에요. 운영 정보는 방문 전 공식 안내를 확인해 주세요.
          </p>
        ) : null}
      </div>
    </header>
  );
}
