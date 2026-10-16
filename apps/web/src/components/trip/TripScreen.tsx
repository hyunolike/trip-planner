'use client';

import { useEffect, useState } from 'react';
import { DayRoute } from '@/components/map/DayRoute';
import { useCompletion } from '@/lib/trip/completion';
import type { TripView } from '@/lib/trip/content';
import { useHashSection } from '@/lib/trip/sections';
import { ChecklistSection } from './ChecklistSection';
import { DayBar } from './DayBar';
import { DayView } from './DayView';
import { LinksSection } from './LinksSection';
import { PlacesSection } from './PlacesSection';
import { SectionNav } from './SectionNav';
import { SightGuideIndex } from './SightGuideIndex';
import { TourGuide } from './TourGuide';
import { TripHeader } from './TripHeader';
import { TripInfo } from './TripInfo';
import styles from './TripScreen.module.css';

type Props = { trip: TripView; initialDay: number; onLocate?: (key: string) => void };

export function TripScreen({ trip, initialDay, onLocate }: Props) {
  const [dayIndex, setDayIndex] = useState(initialDay);
  const [mode, setMode] = useState<'summary' | 'detail'>('summary');
  const [hideDone, setHideDone] = useState(false);
  const [selected, setSelected] = useState<string>();
  const completion = useCompletion(trip.slug);
  const section = useHashSection();
  const day = trip.days[dayIndex] ?? trip.days[0];

  useEffect(() => {
    if (section !== 'itinerary') document.getElementById('main')?.scrollIntoView?.({ block: 'start' });
  }, [section]);

  function selectDay(index: number) {
    setDayIndex(index);
    setSelected(undefined);
    const url = new URL(window.location.href);
    url.searchParams.set('day', String(index + 1));
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }

  const locate =
    onLocate ??
    ((key: string) => {
      setSelected(key);
      document.getElementById('day-map')?.scrollIntoView?.({ block: 'center' });
    });

  if (!day) return null;
  return (
    <>
      <TripHeader trip={trip} />
      <SectionNav active={section} />
      {section === 'itinerary' ? <DayBar days={trip.days} activeIndex={dayIndex} onSelect={selectDay} /> : null}
      <main id="main" className={styles.main}>
        {section === 'itinerary' ? (
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
              before={<DayRoute day={day} selectedKey={selected} onSelect={setSelected} />}
              resources={
                <>
                  {/* Task 10: 날씨 카드 */}
                  {day.tour ? <TourGuide tour={day.tour} date={day.date} /> : null}
                  <SightGuideIndex day={day} />
                </>
              }
            />
            <TripInfo trip={trip} />
          </section>
        ) : null}
        {section === 'food' ? <PlacesSection trip={trip} kind="dining" /> : null}
        {section === 'shopping' ? <PlacesSection trip={trip} kind="shopping" /> : null}
        {section === 'links' ? <LinksSection trip={trip} /> : null}
        {section === 'preparation' ? (
          <ChecklistSection trip={trip} done={completion.items} onToggle={completion.toggleItem} />
        ) : null}
      </main>
    </>
  );
}
