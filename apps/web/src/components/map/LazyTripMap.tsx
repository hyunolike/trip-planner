'use client';

import dynamic from 'next/dynamic';
import styles from './TripMap.module.css';

export const LazyTripMap = dynamic(() => import('./TripMap'), {
  ssr: false,
  loading: () => (
    <div className={styles.frame}>
      <div className={styles.placeholder}>지도를 불러오는 중이에요.</div>
    </div>
  ),
});
