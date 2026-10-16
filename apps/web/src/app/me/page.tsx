import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { DeleteAccount, LogoutButton } from '@/components/auth/AccountActions';
import styles from '@/components/auth/Auth.module.css';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { serverApi } from '@/lib/api/server';

export const metadata: Metadata = { title: '내 정보', robots: { index: false } };

async function Account() {
  const api = await serverApi();
  const { data: me } = await api.GET('/api/v1/me').catch(() => ({ data: undefined }));
  if (!me) redirect('/login');
  return (
    <div className={styles.form}>
      <h1 className={styles.title}>{me.nickname}님</h1>
      <p className={styles.lead}>{me.email}</p>
      <LogoutButton />
      <DeleteAccount />
    </div>
  );
}

export default function MePage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="page page-narrow">
        <Suspense fallback={null}>
          <Account />
        </Suspense>
      </main>
    </>
  );
}
