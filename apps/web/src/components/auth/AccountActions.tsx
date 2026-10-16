'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, TextField } from '@/components/ui';
import { api } from '@/lib/api/client';
import { problemMessage } from '@/lib/api/errors';
import styles from './Auth.module.css';

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="secondary"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await api.POST('/api/v1/auth/logout').catch(() => undefined);
        router.replace('/');
        router.refresh();
      }}
    >
      로그아웃
    </Button>
  );
}

export function DeleteAccount() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <Button variant="danger" onClick={() => setOpen(true)}>
        탈퇴하기
      </Button>
    );
  }

  async function remove() {
    setBusy(true);
    setError(undefined);
    try {
      const { response, error: problem } = await api.DELETE('/api/v1/me');
      if (response.ok) {
        router.replace('/');
        router.refresh();
        return;
      }
      setError(problemMessage(problem, response.status));
    } catch (e) {
      setError(problemMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.danger}>
      <p className={styles.lead}>
        탈퇴하면 계정과 내가 만든 여행이 모두 지워지고 되돌릴 수 없어요. 구글로 가입했다면 구글 연결도 해제해요.
      </p>
      <TextField
        label="확인을 위해 탈퇴를 입력해 주세요"
        value={word}
        onChange={(e) => setWord(e.target.value)}
        autoComplete="off"
      />
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
      <Button variant="danger" disabled={word !== '탈퇴' || busy} onClick={remove}>
        계정과 여행 모두 지우기
      </Button>
      <Button variant="ghost" onClick={() => setOpen(false)}>
        그만두기
      </Button>
    </div>
  );
}
