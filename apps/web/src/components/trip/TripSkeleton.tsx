import styles from './TripScreen.module.css';

/** 데이터 전에 틀을 먼저 그린다. 모션 없는 sunken 면. */
export function TripSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="일정을 불러오는 중이에요">
      <div className={styles.skeletonHeader} />
      <div className={styles.skeletonBar} />
      <div className={styles.main}>
        <div className={styles.skeletonList} />
      </div>
    </div>
  );
}
