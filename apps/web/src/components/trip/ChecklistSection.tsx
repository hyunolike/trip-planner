import { Badge, EmptyState } from '@/components/ui';
import type { TripView } from '@/lib/trip/content';
import { legacySectionsFor } from '@/lib/trip/sections';
import { GuideBlocks } from './GuideBlocks';
import styles from './Sections.module.css';

type Props = { trip: TripView; done: ReadonlySet<string>; onToggle: (id: string) => void; disabled?: boolean };

export function ChecklistSection({ trip, done, onToggle, disabled = false }: Props) {
  const groups = trip.content.checklistGroups;
  const legacy = legacySectionsFor(trip, 'preparation');
  return (
    <section id="preparation" className={styles.section} aria-labelledby="preparation-title">
      <h2 id="preparation-title" className={styles.title}>
        준비물
      </h2>
      <p className={styles.lead}>체크한 항목은 이 기기에만 저장돼요.</p>
      {groups.map((group) => (
        <div key={group.id} className={styles.group}>
          <h3 className={styles.groupTitle}>{group.title}</h3>
          {group.hint ? <p className={styles.lead}>{group.hint}</p> : null}
          <ul className={styles.checklist}>
            {group.items.map((item) => (
              <li key={item.id}>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={done.has(item.id)}
                    onChange={() => onToggle(item.id)}
                  />
                  <span className={styles.checkText}>
                    <span className={styles.checkTitle}>
                      {item.title}
                      {item.priority ? (
                        <Badge tone={item.priority === '필수' ? 'check' : 'neutral'}>{item.priority}</Badge>
                      ) : null}
                    </span>
                    {item.description ? <span className={styles.checkDesc}>{item.description}</span> : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {legacy.map((section) => (
        <GuideBlocks key={section.id} blocks={section.blocks} headingLevel={3} />
      ))}
      {!groups.length && !legacy.length ? (
        <EmptyState illustration="empty-checklist" title="아직 준비물 목록이 없어요." headingLevel={3} />
      ) : null}
    </section>
  );
}
