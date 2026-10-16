import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { TripScreen } from '@/components/trip/TripScreen';
import { TripSkeleton } from '@/components/trip/TripSkeleton';
import { serverApi } from '@/lib/api/server';
import { readTrip } from '@/lib/trip/content';
import { initialDayIndex, todayIn } from '@/lib/trip/day';

export const metadata: Metadata = {
  title: '공유된 여행 일정',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ day?: string }> };
async function SharedTrip({ params, searchParams }: Props) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) notFound();
  const api = await serverApi();
  const result = await api.GET('/api/v1/share/{token}', { params: { path: { token } } });
  if (result.response.status === 404) notFound();
  if (!result.data) throw new Error('shared trip api unavailable');
  const trip = readTrip(result.data);
  const query = await searchParams;
  return (
    <TripScreen
      trip={trip}
      initialDay={initialDayIndex(trip.days, query.day, todayIn(trip.timezone))}
      shareToken={token}
    />
  );
}
export default function SharePage(props: Props) {
  return (
    <Suspense fallback={<TripSkeleton />}>
      <SharedTrip {...props} />
    </Suspense>
  );
}
