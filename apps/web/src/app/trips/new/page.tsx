import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { CreateTripWizard } from '@/components/edit/CreateTripWizard';
import { serverApi } from '@/lib/api/server';

export const metadata = { title: '새 여행 만들기', robots: { index: false } };

export default function NewTripPage() {
  return (
    <Suspense
      fallback={
        <main className="page">
          <p role="status">새 여행을 준비하고 있어요.</p>
        </main>
      }
    >
      <NewTripContent />
    </Suspense>
  );
}

async function NewTripContent() {
  const api = await serverApi();
  const { data, response } = await api.GET('/api/v1/me');
  if (!data) {
    if (response.status === 401) redirect('/login?next=%2Ftrips%2Fnew');
    throw new Error('로그인 상태를 확인하지 못했어요.');
  }
  return <CreateTripWizard />;
}
