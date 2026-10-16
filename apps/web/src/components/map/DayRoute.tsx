'use client';

import { type CSSProperties, useMemo } from 'react';
import { Disclosure } from '@/components/ui';
import { createGoogleDirectionsUrl, createGoogleMapsUrl, getDayMapPoints, getDayRouteSegments } from '@/lib/map/route';
import { isDashed, transitColor } from '@/lib/map/style';
import type { DayView } from '@/lib/trip/content';
import styles from './DayRoute.module.css';
import { LazyTripMap } from './LazyTripMap';

const MODE_LABELS: Record<string, string> = {
  flight: '항공',
  train: '철도',
  cablecar: '케이블카',
  bus: '버스',
  taxi: '택시',
  car: '차량',
  walk: '도보',
  boat: '선박',
};

const pad = (n: number) => String(n).padStart(2, '0');

type Props = { day: DayView; selectedKey?: string; selectionNonce?: number; onSelect: (key: string) => void };

export function DayRoute({ day, selectedKey, selectionNonce, onSelect }: Props) {
  const points = useMemo(() => getDayMapPoints(day), [day]);
  const segments = useMemo(() => getDayRouteSegments(day), [day]);
  if (!points.length) return null;
  const byKey = new Map(points.map((p) => [p.key, p]));
  const modes = [...new Set(segments.map((s) => s.mode))];

  return (
    <section className={styles.route} aria-labelledby="day-route-title">
      <h3 id="day-route-title" className={styles.title}>
        오늘의 이동 경로
      </h3>
      <section id="day-map" aria-label={`${day.number}일차 이동 지도`}>
        <LazyTripMap
          points={points}
          segments={segments}
          selectedKey={selectedKey}
          selectionNonce={selectionNonce}
          onSelect={onSelect}
        />
      </section>
      <ol className={styles.order} aria-label="이날의 이동 순서">
        {points.map((point, index) => (
          <li key={point.key}>
            <button type="button" aria-pressed={point.key === selectedKey} onClick={() => onSelect(point.key)}>
              <span className={styles.number}>{pad(index + 1)}</span>
              {point.title}
            </button>
          </li>
        ))}
      </ol>
      {modes.length ? (
        <ul className={styles.legend} aria-label="지도 선 범례">
          {modes.map((mode) => (
            <li key={mode} className={styles.chip}>
              <span
                className={[styles.line, isDashed(mode) ? styles.dashed : ''].filter(Boolean).join(' ')}
                style={{ '--line-color': `var(--${transitColor(mode)})` } as CSSProperties}
                aria-hidden="true"
              />
              {MODE_LABELS[mode] ?? '이동'}
            </li>
          ))}
        </ul>
      ) : null}
      {segments.length ? (
        <Disclosure summary="Google 지도로 구간별 길찾기">
          <ul className={styles.directions}>
            {segments.map((segment, index) => {
              const flight = segment.mode === 'flight';
              const href = flight
                ? createGoogleMapsUrl(segment.coordinates.at(-1)!)
                : createGoogleDirectionsUrl(segment);
              return (
                <li key={`${segment.fromKey}-${segment.toKey}`}>
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    <small>
                      {pad(index + 1)} · {segment.label}
                    </small>
                    <span>
                      {byKey.get(segment.fromKey)?.title} → {byKey.get(segment.toKey)?.title}
                    </span>
                    <span className="visually-hidden"> {flight ? '도착 공항 위치' : '길찾기'} (새 창)</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </Disclosure>
      ) : null}
      <p className={styles.note}>
        지도 선은 일정의 장소와 경유지를 이은 안내 동선이에요. 실제 경로와 소요시간은 Google 길찾기에서 확인해 주세요.
      </p>
    </section>
  );
}
