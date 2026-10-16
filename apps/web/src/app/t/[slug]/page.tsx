import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { TripScreen } from '@/components/trip/TripScreen';
import { TripSkeleton } from '@/components/trip/TripSkeleton';
import { readTrip } from '@/lib/trip/content';
import { initialDayIndex, todayIn } from '@/lib/trip/day';
import { loadTrip } from '@/lib/trip/load';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadTrip(slug);
  if (result.kind !== 'ok') return { title: '일정을 찾을 수 없어요', robots: { index: false } };
  const trip = result.trip;
  return {
    title: trip.title,
    description: trip.subtitle ?? `${trip.days.length}일 여행 일정`,
    // 검색 엔진에는 public 여행만 보인다(설계 3.7).
    robots: { index: trip.visibility === 'public', follow: trip.visibility === 'public' },
  };
}

export default function TripPage(props: Props) {
  return (
    <Suspense fallback={<TripSkeleton />}>
      <TripContent {...props} />
    </Suspense>
  );
}

async function TripContent({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const result = await loadTrip(slug);
  if (result.kind === 'missing') notFound();
  if (result.kind === 'unavailable') throw new Error('trip api unavailable');
  const trip = readTrip(result.trip);
  return <TripScreen trip={trip} initialDay={initialDayIndex(trip.days, query.day, todayIn(trip.timezone))} />;
}
