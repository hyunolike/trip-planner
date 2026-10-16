import type { DayView } from '@/lib/trip/content';
import { formatDayDate } from '@/lib/trip/format';
import styles from './DayBar.module.css';

type Props = { days: DayView[]; activeIndex: number; onSelect: (index: number) => void };

export function DayBar({ days, activeIndex, onSelect }: Props) {
  return (
    <nav className={styles.bar} aria-label="날짜 선택">
      <ul className={styles.list}>
        {days.map((day, index) => (
          <li key={day.id}>
            <button
              type="button"
              className={styles.day}
              aria-current={index === activeIndex ? 'date' : undefined}
              onClick={() => onSelect(index)}
            >
              <span className={styles.number}>{day.number}일차</span>
              <span className={styles.date}>{formatDayDate(day.date)}</span>
              <span className={styles.city}>{day.city}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
