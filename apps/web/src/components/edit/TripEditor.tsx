'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { DayRoute } from '@/components/map/DayRoute';
import { Button } from '@/components/ui';
import { api } from '@/lib/api/client';
import { useHydrated } from '@/lib/hydration';
import { readTrip, type StopDocument, type TripDocument } from '@/lib/trip/content';
import styles from './Edit.module.css';
import { projectEdits } from './editor-model';
import { FormSheet } from './FormSheet';
import { MetadataForm } from './MetadataForm';
import { PendingChanges } from './PendingChanges';
import { type StopBody, StopForm } from './StopForm';
import { StopList } from './StopList';
import { useEditorQueue } from './useEditorQueue';

type Sheet =
  | { kind: 'stop'; stop?: StopDocument }
  | { kind: 'delete'; stop: StopDocument }
  | { kind: 'day' | 'trip' | 'delete-trip' };

export function TripEditor({
  initialTrip,
  userId,
  initialDay = 0,
}: {
  initialTrip: TripDocument;
  userId: string;
  initialDay?: number;
}) {
  const hydrated = useHydrated();
  const editor = useEditorQueue(initialTrip, userId);
  const document = useMemo(
    () => projectEdits(editor.trip, editor.snapshot.operations),
    [editor.trip, editor.snapshot.operations],
  );
  const [dayIndex, setDayIndex] = useState(initialDay);
  const [sheet, setSheet] = useState<Sheet>();
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string>();
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [showServer, setShowServer] = useState(false);
  const day = document.days[Math.min(dayIndex, document.days.length - 1)];
  const mappedDay = useMemo(() => readTrip(document).days.find((item) => item.id === day?.id), [document, day?.id]);
  if (!initialTrip.permissions.canEdit || initialTrip.isSample)
    return (
      <main className="page">
        <h1>보기 전용 일정이에요.</h1>
        <Link href={`/t/${initialTrip.slug}`}>일정 보기</Link>
      </main>
    );
  if (!day)
    return (
      <main className="page">
        <h1>날짜를 불러오지 못했어요.</h1>
      </main>
    );
  const blocked = ['auth', 'conflict', 'storage-error'].includes(editor.snapshot.status);
  const status =
    editor.snapshot.status === 'syncing'
      ? '저장 중…'
      : editor.snapshot.status === 'offline'
        ? '연결 대기 · 이 기기에 저장됨'
        : blocked
          ? '저장 실패 · 입력은 유지했어요'
          : editor.snapshot.operations.length
            ? '전송 대기'
            : '저장됨';

  async function saveStop(body: StopBody) {
    if (!day) return;
    if (sheet?.kind === 'stop' && sheet.stop) {
      const stop = sheet.stop;
      await editor.mutate({
        type: 'stop.update',
        payload: { stopId: stop.id, body: { ...body, version: stop.version } },
      });
    } else await editor.mutate({ type: 'stop.create', payload: { dayId: day.id, body } });
  }

  async function deleteStop(stop: StopDocument) {
    setDeleteBusy(true);
    setError('');
    try {
      await editor.mutate({ type: 'stop.delete', payload: { stopId: stop.id, version: stop.version } });
      setSheet(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '삭제하지 못했어요.');
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <>
      <div className={styles.status} aria-live="polite">
        <p>편집 중 · {status}</p>
        <Link href={`/t/${document.slug}?day=${day.number}`}>편집 마치기</Link>
        {editor.snapshot.status !== 'idle' && editor.snapshot.status !== 'syncing' ? (
          <Button onClick={() => void editor.retry()}>다시 시도</Button>
        ) : null}
      </div>
      <main id="main" className={styles.editor} data-hydrated={hydrated ? 'true' : undefined}>
        <header className={styles.header}>
          <div>
            <Link href="/">Tripnote</Link>
            <h1>{document.title}</h1>
            <p className={styles.muted}>
              {document.startDate} – {document.endDate}
            </p>
          </div>
          <div className={styles.actions}>
            <Button disabled={blocked} onClick={() => setSheet({ kind: 'trip' })}>
              여행 정보 수정
            </Button>
            <Button
              variant="danger"
              disabled={editor.snapshot.operations.length > 0}
              onClick={() => setSheet({ kind: 'delete-trip' })}
            >
              여행 삭제
            </Button>
          </div>
        </header>
        {editor.snapshot.error ? (
          <div className={styles.error} role="alert">
            <p>{editor.snapshot.error}</p>
            {editor.snapshot.status === 'auth' ? <Link href="/login">로그인하기</Link> : null}
            {editor.snapshot.status === 'conflict' ? (
              <>
                <p>다른 변경사항을 덮어쓰지 않도록 전송을 멈췄어요. 입력은 이 기기에 남아 있어요.</p>
                <Button
                  onClick={() => {
                    void editor
                      .refresh()
                      .then(() => setShowServer(true))
                      .catch(() => setError('최신 일정을 불러오지 못했어요.'));
                  }}
                >
                  서버의 최신 일정 확인
                </Button>
                {showServer ? (
                  <details open>
                    <summary>서버에 저장된 일정</summary>
                    <h3>{editor.trip.title}</h3>
                    {editor.trip.days.map((serverDay) => (
                      <section key={serverDay.id}>
                        <h4>
                          {serverDay.number}일차 · {serverDay.theme}
                        </h4>
                        <ol>
                          {serverDay.stops.map((stop) => (
                            <li key={stop.id}>
                              {stop.time.slice(0, 5)} {stop.title}
                              <p>{stop.details}</p>
                            </li>
                          ))}
                        </ol>
                      </section>
                    ))}
                  </details>
                ) : null}
                <PendingChanges operations={editor.snapshot.operations} trip={editor.trip} onDiscard={editor.discard} />
              </>
            ) : null}
          </div>
        ) : null}
        {error ? (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        ) : null}
        <nav className={styles.days} aria-label="날짜 선택">
          {document.days.map((item, index) => (
            <button
              type="button"
              key={item.id}
              aria-current={day.id === item.id ? 'date' : undefined}
              onClick={() => {
                setDayIndex(index);
                const url = new URL(window.location.href);
                url.searchParams.set('day', String(item.number));
                window.history.replaceState(null, '', url);
              }}
            >
              {item.number}일차 · {item.date.slice(5)}
            </button>
          ))}
        </nav>
        <div className={styles.columns}>
          <section aria-label={`${day.number}일차 편집`}>
            <header className={styles.header}>
              <div>
                <h2>{day.theme || `${day.number}일차 일정`}</h2>
                <p>{day.city}</p>
                {day.note ? <p className={styles.muted}>{day.note}</p> : null}
              </div>
              <Button disabled={blocked} onClick={() => setSheet({ kind: 'day' })}>
                날짜 정보 수정
              </Button>
            </header>
            {!day.stops.length ? <p className={styles.empty}>아직 일정이 없어요. 첫 장소를 추가해 보세요.</p> : null}
            <StopList
              dayNumber={day.number}
              stops={day.stops}
              disabled={blocked}
              onEdit={(stop) => setSheet({ kind: 'stop', stop })}
              onDelete={(stop) => {
                setError('');
                setSheet({ kind: 'delete', stop });
              }}
              onOrder={(stopIds) => {
                void editor
                  .mutate({ type: 'stop.order', payload: { dayId: day.id, body: { stopIds } } })
                  .catch((cause: unknown) =>
                    setError(cause instanceof Error ? cause.message : '순서를 저장하지 못했어요.'),
                  );
              }}
            />
            <Button variant="primary" disabled={blocked} onClick={() => setSheet({ kind: 'stop' })}>
              ＋ 일정 추가
            </Button>
          </section>
          <aside className={styles.map}>
            {mappedDay ? <DayRoute day={mappedDay} selectedKey={selected} onSelect={setSelected} /> : null}
          </aside>
        </div>
      </main>
      {sheet?.kind === 'stop' ? (
        <FormSheet title={sheet.stop ? '일정 수정' : '일정 추가'} onClose={() => setSheet(undefined)}>
          <StopForm
            key={sheet.stop?.id ?? `new-${day.id}`}
            stop={sheet.stop}
            previous={day.stops.at(-1)}
            draftKey={`tripnote:stop-draft:v1:${userId}:${document.id}:${sheet.stop?.id ?? day.id}`}
            onSave={saveStop}
            onDone={() => setSheet(undefined)}
          />
        </FormSheet>
      ) : null}
      {sheet?.kind === 'day' || sheet?.kind === 'trip' ? (
        <FormSheet
          title={sheet.kind === 'day' ? '날짜 정보 수정' : '여행 정보 수정'}
          onClose={() => setSheet(undefined)}
        >
          <MetadataForm
            trip={editor.trip}
            day={sheet.kind === 'day' ? day : undefined}
            onSave={editor.mutate}
            onDone={() => setSheet(undefined)}
          />
        </FormSheet>
      ) : null}
      {sheet?.kind === 'delete' ? (
        <FormSheet title="일정을 삭제할까요?" onClose={() => setSheet(undefined)}>
          <p>“{sheet.stop.title}” 일정을 삭제해요.</p>
          <div className={styles.actions}>
            <Button disabled={deleteBusy} onClick={() => setSheet(undefined)}>
              취소
            </Button>
            <Button variant="danger" disabled={deleteBusy} onClick={() => void deleteStop(sheet.stop)}>
              일정 삭제
            </Button>
          </div>
        </FormSheet>
      ) : null}
      {sheet?.kind === 'delete-trip' ? (
        <FormSheet title="여행을 삭제할까요?" onClose={() => setSheet(undefined)}>
          <p>“{document.title}”의 모든 날짜와 일정이 삭제돼요.</p>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          <div className={styles.actions}>
            <Button disabled={deleteBusy} onClick={() => setSheet(undefined)}>
              취소
            </Button>
            <Button
              variant="danger"
              disabled={deleteBusy}
              onClick={async () => {
                setDeleteBusy(true);
                setError('');
                try {
                  const result = await api.DELETE('/api/v1/trips/{tripId}', {
                    params: { path: { tripId: document.id }, query: { version: editor.trip.version } },
                  });
                  if (result.response.ok) window.location.assign('/');
                  else setError('여행을 삭제하지 못했어요. 최신 일정을 확인해 주세요.');
                } catch {
                  setError('인터넷 연결을 확인해 주세요.');
                } finally {
                  setDeleteBusy(false);
                }
              }}
            >
              여행 삭제하기
            </Button>
          </div>
        </FormSheet>
      ) : null}
    </>
  );
}
