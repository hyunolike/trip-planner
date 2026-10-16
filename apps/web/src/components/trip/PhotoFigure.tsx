import type { Photo } from '@/lib/trip/content';
import { ExternalLink } from './ExternalLink';
import styles from './PhotoFigure.module.css';

type Props = { photo: Photo; variant?: 'wide' | 'hotel' };

export function PhotoFigure({ photo, variant = 'wide' }: Props) {
  const classes = [styles.figure, variant === 'hotel' ? styles.hotel : '', photo.focus === 'top' ? styles.top : '']
    .filter(Boolean)
    .join(' ');
  return (
    <figure className={classes}>
      {/* biome-ignore lint/performance/noImgElement: 샘플 이미지는 5번 계획에서 저장소로 옮긴 뒤 next/image로 바꾼다 */}
      <img
        src={photo.src}
        alt={photo.alt}
        width={photo.width ?? 1200}
        height={photo.height ?? 675}
        loading="lazy"
        decoding="async"
      />
      {photo.credit || photo.context ? (
        <figcaption className={styles.caption}>
          {photo.context ? (
            <>
              {photo.context}
              <br />
            </>
          ) : null}
          {photo.credit ? <>사진: {photo.credit}</> : null}
          {photo.sourceUrl ? (
            <>
              {' · '}
              <ExternalLink href={photo.sourceUrl}>{variant === 'hotel' ? '호텔 공식 안내' : '원본'}</ExternalLink>
            </>
          ) : null}
          {photo.license && photo.licenseUrl ? (
            <>
              {' · '}
              <ExternalLink href={photo.licenseUrl}>{photo.license}</ExternalLink>
            </>
          ) : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
