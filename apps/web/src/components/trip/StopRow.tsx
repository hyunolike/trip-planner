import { Badge, Disclosure, Icon } from '@/components/ui';
import { createGoogleMapsUrl } from '@/lib/map/route';
import type { StopView } from '@/lib/trip/content';
import { stopIcon, stopTypeLabel } from '@/lib/trip/format';
import { ExternalLink } from './ExternalLink';
import { GuideBlocks } from './GuideBlocks';
import { PhotoFigure } from './PhotoFigure';
import styles from './StopRow.module.css';

type Props = {
  stop: StopView;
  done: boolean;
  mode: 'summary' | 'detail';
  onToggle: (key: string) => void;
  onLocate?: (key: string) => void;
};

export function StopRow({ stop, done, mode, onToggle, onLocate }: Props) {
  return (
    <li id={`stop-${stop.key}`} className={[styles.row, done ? styles.done : ''].filter(Boolean).join(' ')}>
      <div className={styles.time}>
        {stop.time}
        {stop.timing ? <small className={styles.timing}>{stop.timing}</small> : null}
      </div>
      <div className={styles.main}>
        <span className={styles.type}>
          <Icon name={stopIcon(stop)} size={16} />
          {stopTypeLabel(stop.type)}
          {stop.optional ? <Badge tone="check">선택</Badge> : null}
        </span>
        <h3 className={styles.title}>{stop.title}</h3>
        <div className={styles.meta}>
          {stop.duration ? (
            <span>
              <Icon name="clock" size={16} />
              {stop.duration}
            </span>
          ) : null}
          {stop.coordinates && onLocate ? (
            <button
              type="button"
              className={styles.locate}
              onClick={() => onLocate(stop.key)}
              aria-label={`${stop.title} 지도에서 보기`}
            >
              <Icon name="map-pin" size={16} />
              위치
            </button>
          ) : null}
        </div>
        {stop.buffer ? (
          <p className={styles.buffer}>
            <Icon name="timer" size={16} />
            {stop.buffer}
          </p>
        ) : null}
        {/* 보기 방식을 바꾸면 key가 바뀌어 모든 행의 열림 상태가 그 방식으로 다시 맞춰진다. */}
        <details key={mode} data-stop-detail className={styles.detail} open={mode === 'detail'}>
          <summary className={styles.locate}>
            상세 안내<span className="visually-hidden"> · {stop.title}</span>
            <Icon name="chevron-down" size={16} />
          </summary>
          <div className={styles.detailBody}>
            {stop.photo ? <PhotoFigure photo={stop.photo} /> : null}
            {stop.hotelPhoto ? <PhotoFigure photo={stop.hotelPhoto} variant="hotel" /> : null}
            <p className={styles.details}>{stop.details}</p>
            {stop.coordinates || stop.links.length ? (
              <div className={styles.sources}>
                {stop.coordinates ? (
                  <ExternalLink href={createGoogleMapsUrl(stop.coordinates)}>Google 지도</ExternalLink>
                ) : null}
                {stop.links.map((link) => (
                  <ExternalLink key={link.url} href={link.url}>
                    {link.label}
                  </ExternalLink>
                ))}
              </div>
            ) : null}
            {stop.guide ? (
              <Disclosure summary={stop.guide.title} className={styles.guide} id={`guide-${stop.key}`}>
                <GuideBlocks blocks={stop.guide.blocks} />
              </Disclosure>
            ) : null}
          </div>
        </details>
      </div>
      <button
        type="button"
        className={styles.check}
        aria-pressed={done}
        aria-label={`일정 완료 표시: ${stop.title}`}
        onClick={() => onToggle(stop.key)}
      >
        <Icon name="check" />
      </button>
    </li>
  );
}
