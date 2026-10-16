import { Disclosure } from '@/components/ui';
import type { Tour } from '@/lib/trip/content';
import { formatDayDate } from '@/lib/trip/format';
import { ExternalLink } from './ExternalLink';
import styles from './TourGuide.module.css';

export function TourGuide({ tour, date }: { tour: Tour; date: string }) {
  return (
    <section className={styles.tour} aria-labelledby="tour-title">
      <span className={styles.provider}>{[tour.provider, formatDayDate(date)].filter(Boolean).join(' · ')}</span>
      <h3 id="tour-title" className={styles.title}>
        {tour.title}
      </h3>
      {tour.source ? <ExternalLink href={tour.source.url}>{tour.source.label}</ExternalLink> : null}
      <dl className={styles.facts}>
        {tour.departure ? (
          <div>
            <dt>출발</dt>
            <dd>{tour.departure}</dd>
          </div>
        ) : null}
        {tour.returnTime ? (
          <div>
            <dt>귀환</dt>
            <dd>{tour.returnTime}</dd>
          </div>
        ) : null}
      </dl>
      {tour.meeting ? (
        <p className={styles.meeting}>
          집합 {tour.meeting}
          {tour.meetingMap ? (
            <>
              {' · '}
              <ExternalLink href={tour.meetingMap}>위치 찾기</ExternalLink>
            </>
          ) : null}
        </p>
      ) : null}
      <Disclosure summary="포함 사항과 준비할 것">
        <p>포함: {tour.included ?? '상품 안내 확인'}</p>
        <p>별도: {tour.excluded ?? '상품 안내 확인'}</p>
        {tour.preparation.length ? (
          <ul className={styles.list}>
            {tour.preparation.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
      </Disclosure>
      {tour.fees.length || tour.feeNote ? (
        <Disclosure summary="입장료·승선료 확인">
          <div className={styles.fees}>
            {tour.fees.map((fee) => (
              <section key={fee.title}>
                <h4>{fee.title}</h4>
                <p>{[fee.adult, fee.child].filter(Boolean).join(' / ')}</p>
                {fee.source ? <ExternalLink href={fee.source.url}>{fee.source.label}</ExternalLink> : null}
              </section>
            ))}
            {tour.feeNote ? <p>{tour.feeNote}</p> : null}
          </div>
        </Disclosure>
      ) : null}
      {tour.checkedAt ? (
        <p className={styles.checked}>{tour.checkedAt} 상품·운영사 안내 확인 · 시간은 교통 상황에 따라 달라져요.</p>
      ) : null}
    </section>
  );
}
