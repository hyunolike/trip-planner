import { Badge } from '@/components/ui';
import { createGoogleMapsUrl } from '@/lib/map/route';
import type { PlaceInfo } from '@/lib/trip/content';
import { ExternalLink } from './ExternalLink';
import styles from './PlaceCard.module.css';

export function PlaceCard({ place }: { place: PlaceInfo }) {
  const rows: [string, string | undefined][] = [
    ['메뉴', place.menu],
    ['품목', place.items],
    ['영업', place.hours],
    ['주소', place.address],
  ];
  const mapUrl = place.mapUrl ?? (place.coordinates ? createGoogleMapsUrl(place.coordinates) : undefined);
  return (
    <article className={styles.card} aria-labelledby={`place-${place.key}`}>
      <div className={styles.head}>
        <div>
          <h3 id={`place-${place.key}`} className={styles.name}>
            {place.name}
          </h3>
          {place.branch ? <p className={styles.branch}>{place.branch}</p> : null}
        </div>
        <Badge>{place.area}</Badge>
      </div>
      {place.category ? <Badge tone="brand">{place.category}</Badge> : null}
      <dl className={styles.facts}>
        {[...rows, ...place.facts.map((f) => [f.label, f.value] as [string, string])]
          .filter((row): row is [string, string] => Boolean(row[1]))
          .map(([label, value]) => (
            <div key={`${label}-${value}`}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
      </dl>
      {place.note ? <p className={styles.note}>{place.note}</p> : null}
      {place.alternatives.length ? (
        <>
          <p className={styles.branch}>대안</p>
          <ul className={styles.alternatives}>
            {place.alternatives.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </>
      ) : null}
      <div className={styles.foot}>
        {mapUrl ? <ExternalLink href={mapUrl}>Google 지도</ExternalLink> : null}
        {[...place.sources, ...place.media].map((link) => (
          <ExternalLink key={link.url} href={link.url}>
            {link.label}
          </ExternalLink>
        ))}
        {place.checkedAt ? <span className={styles.checked}>{place.checkedAt} 확인</span> : null}
      </div>
    </article>
  );
}
