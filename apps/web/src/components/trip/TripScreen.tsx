'use client';

import { useState } from 'react';
import { useCompletion } from '@/lib/trip/completion';
import type { TripView } from '@/lib/trip/content';
import { DayBar } from './DayBar';
import { DayView } from './DayView';
import { TripHeader } from './TripHeader';
import styles from './TripScreen.module.css';

type Props = { trip: TripView; initialDay: number; onLocate?: (key: string) => void };

export function TripScreen({ trip, initialDay, onLocate }: Props) {
  const [dayIndex, setDayIndex] = useState(initialDay);
  const [mode, setMode] = useState<'summary' | 'detail'>('summary');
  const [hideDone, setHideDone] = useState(false);
  const completion = useCompletion(trip.slug);
  const day = trip.days[dayIndex] ?? trip.days[0];

  function selectDay(index: number) {
    setDayIndex(index);
    const url = new URL(window.location.href);
    url.searchParams.set('day', String(index + 1));
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }

  const locate =
    onLocate ??
    ((key: string) => {
      document.getElementById(`stop-${key}`)?.scrollIntoView?.({ block: 'center' });
    });

  if (!day) return null;
  return (
    <>
      <TripHeader trip={trip} />
      <DayBar days={trip.days} activeIndex={dayIndex} onSelect={selectDay} />
      <main id="main" className={styles.main}>
        {/* Task 8: 섹션 내비와 맛집, 쇼핑, 링크, 준비 섹션이 여기 들어온다. */}
        <section id="itinerary" aria-label="일정">
          <DayView
            day={day}
            mode={mode}
            onModeChange={setMode}
            done={completion.stops}
            onToggleStop={completion.toggleStop}
            hideDone={hideDone}
            onHideDoneChange={setHideDone}
            onLocate={locate}
            before={null /* Task 9: 그날 지도 */}
            resources={null /* Task 8: 투어 안내, 명소 가는 길. Task 10: 날씨 */}
          />
        </section>
      </main>
    </>
  );
}
