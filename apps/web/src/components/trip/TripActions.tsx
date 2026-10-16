'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormSheet } from '@/components/edit/FormSheet';
import { Button, TextField } from '@/components/ui';
import { api } from '@/lib/api/client';
import { problemMessage } from '@/lib/api/errors';
import type { TripView } from '@/lib/trip/content';
import styles from './TripActions.module.css';

type Props = { trip: Pick<TripView, 'id' | 'slug' | 'permissions'>; shareToken?: string };

export function TripActions({ trip, shareToken }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [links, setLinks] = useState<{ id: string }[]>([]);
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const params = { path: { tripId: trip.id } };

  async function loadLinks() {
    const result = await api.GET('/api/v1/trips/{tripId}/share-links', { params });
    if (!result.response.ok) throw result.error;
    setLinks(result.data ?? []);
  }
  async function showSharing() {
    setOpen(true);
    setError(undefined);
    try {
      await loadLinks();
    } catch (e) {
      setError(problemMessage(e));
    }
  }
  async function createLink() {
    setBusy(true);
    setError(undefined);
    try {
      const result = await api.POST('/api/v1/trips/{tripId}/share-links', { params });
      if (!result.data) throw result.error;
      setUrl(`${window.location.origin}/s/${result.data.token}`);
      await loadLinks();
    } catch (e) {
      setError(problemMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function revoke(linkId: string) {
    setBusy(true);
    setError(undefined);
    try {
      const result = await api.DELETE('/api/v1/trips/{tripId}/share-links/{linkId}', {
        params: { path: { tripId: trip.id, linkId } },
      });
      if (!result.response.ok) throw result.error;
      setUrl('');
      await loadLinks();
      setMessage('링크를 회수했어요. 이 링크로는 더 이상 열 수 없어요.');
    } catch (e) {
      setError(problemMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function clone() {
    setBusy(true);
    setError(undefined);
    try {
      const result = shareToken
        ? await api.POST('/api/v1/share/{token}/clone', { params: { path: { token: shareToken } } })
        : await api.POST('/api/v1/trips/{slug}/clone', { params: { path: { slug: trip.slug } } });
      if (result.response.status === 401) {
        router.push(`/login?next=${encodeURIComponent(shareToken ? `/s/${shareToken}` : `/t/${trip.slug}`)}`);
        return;
      }
      if (!result.data) throw result.error;
      router.push(`/t/${result.data.slug}/edit`);
      router.refresh();
    } catch (e) {
      setError(problemMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.actions}>
      {trip.permissions.canEdit ? (
        <>
          <Button href={`/t/${trip.slug}/edit`}>일정 편집하기</Button>
          <Button onClick={showSharing}>공유하기</Button>
        </>
      ) : (
        <Button onClick={clone} disabled={busy}>
          내 여행으로 복제하기
        </Button>
      )}
      {!open && error ? <p role="alert">{error}</p> : null}
      {open ? (
        <FormSheet title="보기 전용으로 공유하기" onClose={() => setOpen(false)}>
          <div className={styles.form}>
            <p>링크를 아는 사람은 로그인 없이 일정을 볼 수 있어요. 편집 권한은 주지 않아요.</p>
            <p>예약번호·여권 정보가 메모에 있으면 지워 주세요.</p>
            <label className={styles.ack}>
              <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
              개인정보를 확인했어요
            </label>
            <Button variant="primary" disabled={!acknowledged || busy} onClick={createLink}>
              보기 링크 만들기
            </Button>
            {url ? (
              <>
                <TextField label="보기 링크" value={url} readOnly />
                <Button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(url);
                      setMessage('보기 링크를 복사했어요.');
                    } catch {
                      setMessage('복사하지 못했어요. 위 링크를 길게 눌러 복사해 주세요.');
                    }
                  }}
                >
                  보기 링크 복사하기
                </Button>
                <p>링크는 지금만 보여 드려요. 잃어버렸다면 회수하고 새로 만들어 주세요.</p>
              </>
            ) : null}
            <h3>활성 공유 링크 {links.length}개</h3>
            {links.map((link, index) => (
              <Button key={link.id} variant="danger" disabled={busy} onClick={() => revoke(link.id)}>
                링크 {index + 1} 회수하기
              </Button>
            ))}
            {error ? <p role="alert">{error}</p> : null}
            <p role="status">{message}</p>
          </div>
        </FormSheet>
      ) : null}
    </div>
  );
}
