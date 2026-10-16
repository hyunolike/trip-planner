import Link from 'next/link';
import { Suspense } from 'react';
import { Button } from '@/components/ui';
import { serverApi } from '@/lib/api/server';
import styles from './SiteHeader.module.css';

async function AccountLink() {
  const api = await serverApi();
  const { data: me } = await api.GET('/api/v1/me').catch(() => ({ data: undefined }));
  return me ? (
    <Button href="/me" size="sm" variant="ghost">
      내 정보
    </Button>
  ) : (
    <Button href="/login" size="sm" variant="secondary">
      로그인
    </Button>
  );
}

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} aria-label="여행노트 홈">
          {/* biome-ignore lint/performance/noImgElement: 로고 SVG */}
          <img src="/brand/lockup-horizontal.svg" alt="" width={120} height={28} />
        </Link>
        <Suspense fallback={null}>
          <AccountLink />
        </Suspense>
      </div>
    </header>
  );
}
