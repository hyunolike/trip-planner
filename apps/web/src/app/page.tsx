import { cacheLife, cacheTag } from 'next/cache';
import { connection } from 'next/server';
import { Suspense } from 'react';
import styles from '@/components/home/Home.module.css';
import { MyTrips, SampleList } from '@/components/home/HomeSections';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Button } from '@/components/ui';
import { serverApi } from '@/lib/api/server';
import { createServerApi } from '@/lib/api/server-client';
import { fetchAccount, fetchSamples } from '@/lib/trip/home';

async function cachedSamples() {
  'use cache';
  cacheLife('minutes');
  cacheTag('samples');
  const samples = await fetchSamples(createServerApi(''));
  // 실패를 캐시하지 않도록 던진다. 밖에서 받아 안내 문구로 바꾼다.
  if (!samples) throw new Error('samples unavailable');
  return samples;
}

async function Samples() {
  await connection();
  const samples = await cachedSamples().catch(() => null);
  return <SampleList samples={samples} />;
}

async function Account() {
  return <MyTrips account={await fetchAccount(await serverApi())} />;
}

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="page">
        <section className={styles.hero} aria-labelledby="home-title">
          <h1 id="home-title" className={styles.headline}>
            예약은 어디서든, 일정은 여기서.
          </h1>
          <p className={styles.lead}>
            여행 당일 손에 들고 보는 일정표예요. 시간과 동선, 메모와 준비물을 한 화면에서 확인해요.
          </p>
          <div className={styles.actions}>
            <Button href="#samples" variant="primary">
              샘플 일정 보기
            </Button>
          </div>
        </section>
        <Suspense fallback={<p className={styles.message}>내 여행을 불러오는 중이에요.</p>}>
          <Account />
        </Suspense>
        <Suspense fallback={<p className={styles.message}>샘플 일정을 불러오는 중이에요.</p>}>
          <Samples />
        </Suspense>
      </main>
    </>
  );
}
