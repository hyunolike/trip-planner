import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

type Illustration = 'empty-itinerary' | 'empty-checklist' | 'empty-search' | 'empty-share' | 'offline';
type Props = { illustration: Illustration; title: string; text?: string; action?: ReactNode; headingLevel?: 1 | 2 | 3 };

export function EmptyState({ illustration, title, text, action, headingLevel = 2 }: Props) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div className={styles.empty}>
      {/* biome-ignore lint/performance/noImgElement: 정적 SVG 일러스트 */}
      <img src={`/ds/illustrations/${illustration}.svg`} alt="" width={240} height={160} />
      <Heading className={styles.title}>{title}</Heading>
      {text ? <p className={styles.text}>{text}</p> : null}
      {action}
    </div>
  );
}
