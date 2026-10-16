'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import type { EditMutation } from '@/lib/edit/transport';
import type { DayDocument, TripDocument } from '@/lib/trip/content';
import styles from './Edit.module.css';

export function MetadataForm({
  trip,
  day,
  onSave,
  onDone,
}: {
  trip: TripDocument;
  day?: DayDocument;
  onSave: (mutation: EditMutation) => Promise<void>;
  onDone: () => void;
}) {
  const [title, setTitle] = useState(trip.title);
  const [startDate, setStartDate] = useState(trip.startDate);
  const [endDate, setEndDate] = useState(trip.endDate);
  const [city, setCity] = useState(day?.city ?? '');
  const [theme, setTheme] = useState(day?.theme ?? '');
  const [note, setNote] = useState(day?.note ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      className={styles.form}
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
          if (day)
            await onSave({
              type: 'day.update',
              payload: { dayId: day.id, body: { version: trip.version, city, theme, note } },
            });
          else {
            if (endDate < startDate) throw new Error('종료 날짜는 시작 날짜 이후여야 해요.');
            await onSave({
              type: 'trip.update',
              payload: { body: { version: trip.version, title: title.trim(), startDate, endDate } },
            });
          }
          onDone();
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : '저장하지 못했어요.');
        } finally {
          setBusy(false);
        }
      }}
    >
      {day ? (
        <>
          <label className={styles.field}>
            도시
            <input maxLength={40} value={city} onChange={(event) => setCity(event.target.value)} />
          </label>
          <label className={styles.field}>
            이날의 주제
            <input maxLength={100} value={theme} onChange={(event) => setTheme(event.target.value)} />
          </label>
          <label className={styles.field}>
            이날의 메모
            <textarea maxLength={4000} value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
        </>
      ) : (
        <>
          <label className={styles.field}>
            여행 제목
            <input maxLength={60} required value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className={styles.field}>
            시작 날짜
            <input type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label className={styles.field}>
            종료 날짜
            <input
              type="date"
              required
              min={startDate}
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
          <p className={styles.muted}>일정이 있는 날짜는 삭제되지 않아요. 날짜 변경은 인터넷 연결이 필요해요.</p>
        </>
      )}
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="primary" disabled={busy}>
        {busy ? '저장 중…' : '변경사항 저장'}
      </Button>
    </form>
  );
}
