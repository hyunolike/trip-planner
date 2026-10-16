import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { TripEditor } from '@/components/edit/TripEditor';
import { serverApi } from '@/lib/api/server';
import { initialDayIndex, todayIn } from '@/lib/trip/day';
import { loadTrip } from '@/lib/trip/load';

export const metadata = { title: '여행 일정 편집', robots: { index: false } };

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function EditTripPage(props: Props) {
  return (
    <Suspense
      fallback={
        <main className="page">
          <p role="status">일정 편집을 준비하고 있어요.</p>
        </main>
      }
    >
      <EditTripContent {...props} />
    </Suspense>
  );
}

async function EditTripContent({ params, searchParams }: Props) {
  const { slug } = await params;
  const api = await serverApi();
  const me = await api.GET('/api/v1/me');
  if (!me.data) {
    if (me.response.status === 401) redirect(`/login?next=${encodeURIComponent(`/t/${slug}/edit`)}`);
    throw new Error('로그인 상태를 확인하지 못했어요.');
  }
  const result = await loadTrip(slug);
  if (result.kind === 'missing') notFound();
  if (result.kind === 'unavailable') throw new Error('trip api unavailable');
  if (!result.trip.permissions.canEdit || result.trip.isSample) redirect(`/t/${slug}`);
  const query = await searchParams;
  return (
    <TripEditor
      initialTrip={result.trip}
      userId={me.data.id}
      initialDay={initialDayIndex(result.trip.days, query.day, todayIn(result.trip.timezone))}
    />
  );
}
