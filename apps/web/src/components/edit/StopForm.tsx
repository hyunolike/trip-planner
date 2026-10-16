'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import type { StopDocument } from '@/lib/trip/content';
import { CoordinatePicker } from './CoordinatePicker';
import styles from './Edit.module.css';
import { extraDraftLinks, restoreStopDraft, type StopDraft, stopDraftBody, toStopDraft } from './stop-draft';

export type StopBody = ReturnType<typeof stopDraftBody>;
type Props = {
  stop?: StopDocument;
  previous?: StopDocument;
  draftKey: string;
  onSave: (body: StopBody) => Promise<void>;
  onDone: () => void;
};

export function StopForm({ stop, previous, draftKey, onSave, onDone }: Props) {
  const [restored] = useState(() => {
    const initial = toStopDraft(stop, previous);
    try {
      return restoreStopDraft(localStorage.getItem(draftKey), initial, stop?.version);
    } catch {
      /* The current form stays usable if browser storage is unavailable. */
    }
    return { draft: initial, stale: false, baseVersion: stop?.version ?? null };
  });
  const [draft, setDraft] = useState<StopDraft>(restored.draft);
  const [stale, setStale] = useState(restored.stale);
  const baseVersion = useRef(restored.baseVersion);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const save = useRef(onSave);
  save.current = onSave;
  const revision = useRef(0);
  const extraLinks = extraDraftLinks(draft);

  useEffect(() => {
    if (!dirty) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({ version: 1, baseVersion: baseVersion.current, draft }));
    } catch {
      setError('입력은 유지되지만 이 기기에 저장하지 못했어요. 창을 닫기 전에 다시 저장해 주세요.');
    }
    if (!stop || stale) return;
    const currentRevision = revision.current;
    const timeout = window.setTimeout(async () => {
      let body: StopBody;
      try {
        body = stopDraftBody(draft);
      } catch {
        return;
      }
      try {
        await save.current(body);
        if (revision.current === currentRevision) {
          setDirty(false);
          // The queue has persisted this body, including when the network is offline.
          try {
            localStorage.removeItem(draftKey);
          } catch {
            /* The queued body is already durable. */
          }
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : '입력을 저장하지 못했어요.');
      }
    }, 800);
    return () => window.clearTimeout(timeout);
  }, [draft, dirty, draftKey, stop, stale]);

  function field(key: keyof StopDraft, value: string) {
    revision.current += 1;
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setError('');
  }

  async function submit() {
    if (stale) return;
    setError('');
    setBusy(true);
    try {
      await onSave(stopDraftBody(draft));
      setDirty(false);
      localStorage.removeItem(draftKey);
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '입력을 저장하지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {stale ? (
        <div className={styles.error} role="alert">
          <p>서버에서 일정이 바뀌었어요. 이전 초안을 보존했어요. 필요한 내용을 복사한 뒤 서버 내용으로 바꿔 주세요.</p>
          <Button
            onClick={() => {
              setDraft(toStopDraft(stop, previous));
              setStale(false);
              setDirty(false);
              setError('');
              baseVersion.current = stop?.version ?? null;
              try {
                localStorage.removeItem(draftKey);
              } catch {
                setError('이 기기의 초안을 지우지 못했어요.');
              }
            }}
          >
            서버 내용으로 바꾸기
          </Button>
        </div>
      ) : null}
      <label className={styles.field}>
        제목
        <input value={draft.title} maxLength={80} required onChange={(event) => field('title', event.target.value)} />
      </label>
      <div className={styles.pair}>
        <label className={styles.field}>
          시간
          <input type="time" value={draft.time.slice(0, 5)} onChange={(event) => field('time', event.target.value)} />
        </label>
        <label className={styles.field}>
          유형
          <select value={draft.type} onChange={(event) => field('type', event.target.value)}>
            <option value="sight">관광</option>
            <option value="meal">식사</option>
            <option value="transport">이동</option>
            <option value="hotel">숙소</option>
            <option value="airport">공항</option>
            <option value="shopping">쇼핑</option>
            {!['sight', 'meal', 'transport', 'hotel', 'airport', 'shopping'].includes(draft.type) ? (
              <option value={draft.type}>{draft.type}</option>
            ) : null}
          </select>
        </label>
      </div>
      <div className={styles.pair}>
        <label className={styles.field}>
          소요시간
          <input
            placeholder="1시간 30분"
            maxLength={40}
            value={draft.duration}
            onChange={(event) => field('duration', event.target.value)}
          />
        </label>
        <label className={styles.field}>
          출발 목표 버퍼
          <input
            placeholder="출발 20분 전"
            maxLength={80}
            value={draft.buffer}
            onChange={(event) => field('buffer', event.target.value)}
          />
        </label>
      </div>
      <label className={styles.field}>
        메모
        <textarea maxLength={4000} value={draft.details} onChange={(event) => field('details', event.target.value)} />
      </label>
      <div className={styles.pair}>
        <label className={styles.field}>
          링크 이름
          <input maxLength={80} value={draft.linkLabel} onChange={(event) => field('linkLabel', event.target.value)} />
        </label>
        <label className={styles.field}>
          링크 주소
          <input
            type="url"
            placeholder="https://"
            maxLength={2000}
            value={draft.linkUrl}
            onChange={(event) => field('linkUrl', event.target.value)}
          />
        </label>
      </div>
      <label className={styles.field}>
        링크 메모
        <input
          maxLength={1000}
          value={draft.linkNote ?? ''}
          onChange={(event) => field('linkNote', event.target.value)}
        />
      </label>
      {extraLinks.map((link, index) => (
        <fieldset className={styles.form} key={link.id}>
          <legend>링크 {index + 2}</legend>
          <label className={styles.field}>
            링크 이름 {index + 2}
            <input
              value={link.label}
              maxLength={80}
              onChange={(event) =>
                field(
                  'extraLinks',
                  JSON.stringify(
                    extraLinks.map((item) => (item.id === link.id ? { ...item, label: event.target.value } : item)),
                  ),
                )
              }
            />
          </label>
          <label className={styles.field}>
            링크 주소 {index + 2}
            <input
              type="url"
              value={link.url}
              maxLength={2000}
              onChange={(event) =>
                field(
                  'extraLinks',
                  JSON.stringify(
                    extraLinks.map((item) => (item.id === link.id ? { ...item, url: event.target.value } : item)),
                  ),
                )
              }
            />
          </label>
          <label className={styles.field}>
            링크 메모 {index + 2}
            <input
              value={link.note}
              maxLength={1000}
              onChange={(event) =>
                field(
                  'extraLinks',
                  JSON.stringify(
                    extraLinks.map((item) => (item.id === link.id ? { ...item, note: event.target.value } : item)),
                  ),
                )
              }
            />
          </label>
          <Button
            variant="danger"
            onClick={() => field('extraLinks', JSON.stringify(extraLinks.filter((item) => item.id !== link.id)))}
          >
            링크 {index + 2} 삭제
          </Button>
        </fieldset>
      ))}
      <Button
        disabled={extraLinks.length >= 19}
        onClick={() =>
          field(
            'extraLinks',
            JSON.stringify([...extraLinks, { id: crypto.randomUUID(), label: '', url: '', note: '' }]),
          )
        }
      >
        링크 추가
      </Button>
      <p className={styles.muted}>좌표는 위도, 경도 순서예요. 저장하면 일정 지도에 표시돼요.</p>
      <Button aria-expanded={showMap} onClick={() => setShowMap(!showMap)}>
        지도에서 위치 선택하기
      </Button>
      {showMap ? (
        <CoordinatePicker
          latitude={draft.latitude}
          longitude={draft.longitude}
          onPick={([latitude, longitude]) => {
            revision.current += 1;
            setDraft((current) => ({ ...current, latitude: String(latitude), longitude: String(longitude) }));
            setDirty(true);
            setError('');
          }}
        />
      ) : null}
      <div className={styles.pair}>
        <label className={styles.field}>
          위도
          <input
            type="number"
            step="any"
            min="-90"
            max="90"
            value={draft.latitude}
            onChange={(event) => field('latitude', event.target.value)}
          />
        </label>
        <label className={styles.field}>
          경도
          <input
            type="number"
            step="any"
            min="-180"
            max="180"
            value={draft.longitude}
            onChange={(event) => field('longitude', event.target.value)}
          />
        </label>
      </div>
      {stop ? (
        <p role="status" className={styles.muted}>
          {dirty ? '입력 후 0.8초 뒤 자동 저장해요.' : '입력한 변경사항을 저장했어요.'}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="primary" disabled={busy || stale}>
        {busy ? '저장 중…' : stop ? '저장하고 닫기' : '일정 추가'}
      </Button>
    </form>
  );
}
