import { Button } from '@/components/ui';
import type { QueuedMutation } from '@/lib/edit/queue';
import { type EditMutation, editMutation } from '@/lib/edit/transport';
import type { TripDocument } from '@/lib/trip/content';
import styles from './Edit.module.css';

const TYPES: Record<string, string> = {
  sight: '관광',
  meal: '식사',
  transport: '이동',
  hotel: '숙소',
  airport: '공항',
  shopping: '쇼핑',
};

function Description({ mutation, trip }: { mutation: EditMutation; trip: TripDocument }) {
  const stopTitle = (id: string) =>
    trip.days.flatMap((day) => day.stops).find((stop) => stop.id === id)?.title ?? '일정';
  switch (mutation.type) {
    case 'stop.create':
    case 'stop.update': {
      const body = mutation.payload.body;
      const label = mutation.type === 'stop.create' ? '일정 추가' : `일정 수정: ${stopTitle(mutation.payload.stopId)}`;
      return (
        <>
          <h3>{label}</h3>
          <dl className={styles.draftDetails}>
            {body.title != null ? (
              <>
                <dt>제목</dt>
                <dd>{body.title}</dd>
              </>
            ) : null}
            {body.time != null ? (
              <>
                <dt>시간</dt>
                <dd>{body.time}</dd>
              </>
            ) : null}
            {body.type != null ? (
              <>
                <dt>유형</dt>
                <dd>{TYPES[body.type] ?? body.type}</dd>
              </>
            ) : null}
            {body.duration != null ? (
              <>
                <dt>소요시간</dt>
                <dd>{body.duration || '없음'}</dd>
              </>
            ) : null}
            {'buffer' in body && body.buffer != null ? (
              <>
                <dt>출발 목표 버퍼</dt>
                <dd>{body.buffer || '없음'}</dd>
              </>
            ) : null}
            {body.details != null ? (
              <>
                <dt>메모</dt>
                <dd>{body.details || '없음'}</dd>
              </>
            ) : null}
            {body.coordinates ? (
              <>
                <dt>좌표</dt>
                <dd>{body.coordinates.join(', ')}</dd>
              </>
            ) : null}
            {body.links != null ? (
              <>
                <dt>링크</dt>
                <dd>
                  {body.links.length
                    ? body.links.map((link) => (
                        <p key={link.url}>
                          {link.label}: {link.url}
                          {link.note ? ` (${link.note})` : ''}
                        </p>
                      ))
                    : '없음'}
                </dd>
              </>
            ) : null}
          </dl>
        </>
      );
    }
    case 'stop.delete':
      return <p>일정 삭제: {stopTitle(mutation.payload.stopId)}</p>;
    case 'stop.order':
      return (
        <>
          <h3>일정 순서 변경</h3>
          <ol>
            {mutation.payload.body.stopIds.map((id) => (
              <li key={id}>{stopTitle(id)}</li>
            ))}
          </ol>
        </>
      );
    case 'day.update': {
      const body = mutation.payload.body;
      return (
        <>
          <h3>날짜 정보 수정</h3>
          <dl className={styles.draftDetails}>
            <dt>도시</dt>
            <dd>{body.city ?? '변경 없음'}</dd>
            <dt>이날의 주제</dt>
            <dd>{body.theme ?? '변경 없음'}</dd>
            <dt>이날의 메모</dt>
            <dd>{body.note ?? '변경 없음'}</dd>
          </dl>
        </>
      );
    }
    case 'trip.update': {
      const body = mutation.payload.body;
      return (
        <>
          <h3>여행 정보 수정</h3>
          <dl className={styles.draftDetails}>
            <dt>여행 제목</dt>
            <dd>{body.title ?? '변경 없음'}</dd>
            <dt>시작 날짜</dt>
            <dd>{body.startDate ?? '변경 없음'}</dd>
            <dt>종료 날짜</dt>
            <dd>{body.endDate ?? '변경 없음'}</dd>
          </dl>
        </>
      );
    }
  }
}

export function PendingChanges({
  operations,
  trip,
  onDiscard,
}: {
  operations: readonly QueuedMutation[];
  trip: TripDocument;
  onDiscard: (id: string) => void;
}) {
  return (
    <details>
      <summary>저장하지 못한 내용 확인</summary>
      {operations.map((operation) => {
        let mutation: EditMutation | undefined;
        try {
          mutation = editMutation(operation);
        } catch {
          /* Invalid stored input remains removable. */
        }
        return (
          <section key={operation.id} className={styles.stop}>
            {mutation ? (
              <Description mutation={mutation} trip={trip} />
            ) : (
              <p>이 기기에 저장된 변경사항을 읽지 못했어요.</p>
            )}
            <Button variant="danger" onClick={() => onDiscard(operation.id)}>
              이 변경사항 버리기
            </Button>
          </section>
        );
      })}
    </details>
  );
}
