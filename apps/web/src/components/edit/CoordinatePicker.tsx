'use client';

import { LazyTripMap } from '@/components/map/LazyTripMap';
import type { LatLng } from '@/lib/trip/content';
import styles from './Edit.module.css';

export function CoordinatePicker({
  latitude,
  longitude,
  onPick,
}: {
  latitude: string;
  longitude: string;
  onPick: (point: LatLng) => void;
}) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const valid =
    latitude.trim() &&
    longitude.trim() &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180;
  return (
    <section aria-label="일정 위치 선택 지도">
      <p className={styles.muted}>지도를 눌러 핀을 찍어 주세요. 키보드로는 아래 좌표 입력칸을 사용할 수 있어요.</p>
      <LazyTripMap
        points={
          valid
            ? [{ key: 'picked-location', title: '선택한 위치', time: '', coordinates: [lat, lng], approximate: false }]
            : []
        }
        segments={[]}
        onSelect={() => {}}
        onPick={onPick}
      />
    </section>
  );
}
