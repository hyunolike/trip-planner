import { EmptyState } from '@/components/ui';
import type { TripView } from '@/lib/trip/content';
import { legacySectionsFor } from '@/lib/trip/sections';
import { GuideBlocks } from './GuideBlocks';
import { PlaceCard } from './PlaceCard';
import styles from './Sections.module.css';

const COPY = {
  dining: { id: 'food', title: '맛집 후보', empty: '아직 맛집 후보가 없어요.' },
  shopping: { id: 'shopping', title: '쇼핑 후보', empty: '아직 쇼핑 후보가 없어요.' },
} as const;

export function PlacesSection({ trip, kind }: { trip: TripView; kind: 'dining' | 'shopping' }) {
  const copy = COPY[kind];
  const places = trip.places.filter((p) => p.kind === kind);
  const legacy = legacySectionsFor(trip, copy.id);
  return (
    <section id={copy.id} className={styles.section} aria-labelledby={`${copy.id}-title`}>
      <h2 id={`${copy.id}-title`} className={styles.title}>
        {copy.title}
      </h2>
      {places.length ? (
        <div className={styles.grid}>
          {places.map((place) => (
            <PlaceCard key={place.key} place={place} />
          ))}
        </div>
      ) : null}
      {legacy.map((section) => (
        <GuideBlocks key={section.id} blocks={section.blocks} headingLevel={3} />
      ))}
      {!places.length && !legacy.length ? (
        <EmptyState illustration="empty-search" title={copy.empty} headingLevel={3} />
      ) : null}
    </section>
  );
}
