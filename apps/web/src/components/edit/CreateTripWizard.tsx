'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui';
import { api } from '@/lib/api/client';
import { problemMessage } from '@/lib/api/errors';
import type { components } from '@/lib/api/schema';
import { useHydrated } from '@/lib/hydration';
import styles from './Edit.module.css';

export function CreateTripWizard() {
  const hydrated = useHydrated();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [city, setCity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [travelers, setTravelers] = useState([{ id: 'first', label: '', emoji: '' }]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function create(skip: boolean) {
    setBusy(true);
    setError('');
    const companions = skip
      ? []
      : travelers
          .filter((person) => person.label.trim())
          .map((person) => ({
            label: person.label.trim(),
            ...(person.emoji.trim() ? { emoji: person.emoji.trim() } : {}),
          }));
    const body = {
      title: `${city.trim()} 여행`,
      city: city.trim(),
      startDate,
      endDate,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul',
      travelers: companions,
    } satisfies components['schemas']['CreateTripRequest'];
    try {
      const result = await api.POST('/api/v1/trips', { body });
      if (!result.data) {
        setError(problemMessage(result.error, result.response.status));
        return;
      }
      router.push(`/t/${result.data.slug}/edit?day=1`);
      router.refresh();
    } catch (cause) {
      setError(problemMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={`page page-narrow ${styles.wizard}`}>
      <Link href="/">← 내 여행</Link>
      <p className={styles.kicker}>새 여행 · {step + 1} / 3</p>
      <h1>{['어디로 떠나나요?', '언제 떠나나요?', '누구와 함께하나요?'][step]}</h1>
      <p className={styles.muted}>나만 볼 수 있는 여행으로 시작해요.</p>
      <form
        data-hydrated={hydrated ? 'true' : undefined}
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          setError('');
          if (step === 0 && !city.trim()) {
            setError('도시 이름을 입력해 주세요.');
            return;
          }
          if (step === 1 && (!startDate || !endDate || endDate < startDate)) {
            setError('시작과 종료 날짜를 확인해 주세요.');
            return;
          }
          if (step < 2) setStep(step + 1);
          else void create(false);
        }}
      >
        {step === 0 ? (
          <label className={styles.field}>
            도시 이름
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="오사카, 교토"
              maxLength={40}
              required
            />
          </label>
        ) : null}
        {step === 1 ? (
          <>
            <label className={styles.field}>
              시작 날짜
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
            </label>
            <label className={styles.field}>
              종료 날짜
              <input
                type="date"
                min={startDate}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                required
              />
            </label>
          </>
        ) : null}
        {step === 2 ? (
          <>
            <p className={styles.muted}>동행은 나중에 정해도 괜찮아요.</p>
            {travelers.map((person, index) => (
              <div className={styles.pair} key={person.id}>
                <label className={styles.field}>
                  동행 이름 {index + 1}
                  <input
                    value={person.label}
                    maxLength={40}
                    onChange={(event) =>
                      setTravelers(
                        travelers.map((item, i) => (i === index ? { ...item, label: event.target.value } : item)),
                      )
                    }
                  />
                </label>
                <label className={styles.field}>
                  동행 이모지 {index + 1}
                  <input
                    value={person.emoji}
                    maxLength={20}
                    placeholder="🙂"
                    onChange={(event) =>
                      setTravelers(
                        travelers.map((item, i) => (i === index ? { ...item, emoji: event.target.value } : item)),
                      )
                    }
                  />
                </label>
              </div>
            ))}
            <Button
              disabled={travelers.length >= 20 || busy}
              onClick={() => setTravelers([...travelers, { id: crypto.randomUUID(), label: '', emoji: '' }])}
            >
              동행 추가
            </Button>
          </>
        ) : null}
        {error ? (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        ) : null}
        <div className={styles.actions}>
          {step ? (
            <Button disabled={busy} onClick={() => setStep(step - 1)}>
              이전
            </Button>
          ) : null}
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? '만드는 중…' : step === 2 ? '여행 만들기' : '다음'}
          </Button>
          {step === 2 ? (
            <Button disabled={busy} onClick={() => void create(true)}>
              건너뛰고 만들기
            </Button>
          ) : null}
        </div>
      </form>
    </main>
  );
}
