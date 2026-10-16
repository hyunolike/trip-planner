import { Button, EmptyState } from '@/components/ui';
import type { MeResponse, TripSummary } from '@/lib/trip/content';
import styles from './Home.module.css';
import { TripCard } from './TripCard';

export function SampleList({ samples }: { samples: TripSummary[] | null }) {
  return (
    <section id="samples" className={styles.section} aria-labelledby="samples-title">
      <h2 id="samples-title" className={styles.sectionTitle}>
        샘플 일정
      </h2>
      {samples === null ? (
        <p className={styles.message}>샘플 일정을 불러오지 못했어요. 잠시 후 새로고침해 주세요.</p>
      ) : null}
      {samples?.length === 0 ? <p className={styles.message}>지금은 공개된 샘플 일정이 없어요.</p> : null}
      {samples?.length ? (
        <div className={styles.cards}>
          {samples.map((trip) => (
            <TripCard key={trip.slug} trip={trip} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

type Account = { me: MeResponse; trips: TripSummary[] } | null;

export function MyTrips({ account }: { account: Account }) {
  if (!account) {
    return (
      <section className={styles.section} aria-labelledby="my-trips-title">
        <h2 id="my-trips-title" className={styles.sectionTitle}>
          내 여행
        </h2>
        <p className={styles.message}>로그인하면 내가 만든 여행과 복제한 여행을 여기서 볼 수 있어요.</p>
        <div className={styles.actions}>
          <Button href="/login" variant="primary">
            로그인하기
          </Button>
        </div>
      </section>
    );
  }
  return (
    <section className={styles.section} aria-labelledby="my-trips-title">
      <h2 id="my-trips-title" className={styles.sectionTitle}>
        {account.me.nickname}님의 여행
      </h2>
      {account.trips.length ? (
        <div className={styles.cards}>
          {account.trips.map((trip) => (
            <TripCard key={trip.slug} trip={trip} />
          ))}
        </div>
      ) : (
        <EmptyState
          illustration="empty-itinerary"
          title="아직 만든 여행이 없어요"
          text="여행 만들기는 곧 열려요. 먼저 샘플 일정을 둘러보세요."
          action={<Button href="#samples">샘플 일정 보기</Button>}
          headingLevel={3}
        />
      )}
    </section>
  );
}
