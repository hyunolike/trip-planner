import { EmptyState } from '@/components/ui';
import type { TripView } from '@/lib/trip/content';
import { legacySectionsFor } from '@/lib/trip/sections';
import { ExternalLink } from './ExternalLink';
import { GuideBlocks } from './GuideBlocks';
import styles from './Sections.module.css';

export function LinksSection({ trip }: { trip: TripView }) {
  const legacy = legacySectionsFor(trip, 'links');
  const groups = trip.content.linkGroups;
  return (
    <section id="links" className={styles.section} aria-labelledby="links-title">
      <h2 id="links-title" className={styles.title}>
        예약·공식 링크
      </h2>
      {groups.map((group) => (
        <div key={group.label} className={styles.group}>
          <h3 className={styles.groupTitle}>{group.label}</h3>
          <ul className={styles.links}>
            {group.links.map((link) => (
              <li key={link.url}>
                <ExternalLink href={link.url}>{link.label}</ExternalLink>
                {link.note ? <span className={styles.linkNote}> {link.note}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {legacy.map((section) => (
        <GuideBlocks key={section.id} blocks={section.blocks} headingLevel={3} />
      ))}
      {!groups.length && !legacy.length ? (
        <EmptyState illustration="empty-share" title="아직 모아 둔 링크가 없어요." headingLevel={3} />
      ) : null}
    </section>
  );
}
