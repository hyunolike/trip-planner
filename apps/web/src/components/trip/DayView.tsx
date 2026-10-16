import type { ReactNode } from 'react';
import { Button, SegmentedControl } from '@/components/ui';
import type { DayView as Day } from '@/lib/trip/content';
import { formatDayDate } from '@/lib/trip/format';
import styles from './DayView.module.css';
import { StopRow } from './StopRow';

type Props = {
  day: Day;
  mode: 'summary' | 'detail';
  onModeChange: (mode: 'summary' | 'detail') => void;
  done: ReadonlySet<string>;
  onToggleStop: (key: string) => void;
  hideDone: boolean;
  onHideDoneChange: (hide: boolean) => void;
  onLocate?: (key: string) => void;
  before?: ReactNode;
  resources?: ReactNode;
};

export function DayView({
  day,
  mode,
  onModeChange,
  done,
  onToggleStop,
  hideDone,
  onHideDoneChange,
  onLocate,
  before,
  resources,
}: Props) {
  const completed = day.stops.filter((s) => done.has(s.key)).length;
  const visible = hideDone ? day.stops.filter((s) => !done.has(s.key)) : day.stops;
  return (
    <article className={styles.day} aria-labelledby={`day-${day.number}-theme`}>
      <header>
        <p className={styles.eyebrow}>
          {day.number}일차 · {formatDayDate(day.date)} · {day.city}
        </p>
        <h2 id={`day-${day.number}-theme`} className={styles.theme}>
          {day.theme}
        </h2>
        <p className={styles.score} aria-live="polite">
          {completed} / {day.stops.length} 완료
        </p>
      </header>
      {before}
      <div className={styles.toolbar}>
        <SegmentedControl
          label="일정 보기 방식"
          value={mode}
          onChange={onModeChange}
          options={[
            { value: 'summary', label: '간략 일정' },
            { value: 'detail', label: '상세 일정' },
          ]}
        />
        <Button
          size="sm"
          variant="ghost"
          icon="check"
          aria-pressed={hideDone}
          onClick={() => onHideDoneChange(!hideDone)}
        >
          완료한 일정 숨기기
        </Button>
      </div>
      <ol className={styles.stops} aria-label={`${day.number}일차 일정`}>
        {visible.map((stop) => (
          <StopRow
            key={stop.id}
            stop={stop}
            done={done.has(stop.key)}
            mode={mode}
            onToggle={onToggleStop}
            onLocate={onLocate}
          />
        ))}
      </ol>
      <div className={styles.resources}>
        {day.note ? <p className={styles.note}>{day.note}</p> : null}
        {resources}
      </div>
    </article>
  );
}
