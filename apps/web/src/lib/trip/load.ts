import type { Client } from 'openapi-fetch';
import { cache } from 'react';
import type { paths } from '@/lib/api/schema';
import type { TripDocument } from './content';

export type TripLoad = { kind: 'ok'; trip: TripDocument } | { kind: 'missing' } | { kind: 'unavailable' };

const SLUG = /^[A-Za-z0-9_-]{1,100}$/;

export async function fetchTrip(api: Client<paths>, slug: string): Promise<TripLoad> {
  if (!SLUG.test(slug)) return { kind: 'missing' };
  try {
    const { data, response } = await api.GET('/api/v1/trips/{slug}', { params: { path: { slug } } });
    if (data) return { kind: 'ok', trip: data };
    return response.status === 404 ? { kind: 'missing' } : { kind: 'unavailable' };
  } catch {
    return { kind: 'unavailable' };
  }
}

/** generateMetadata와 페이지가 같은 요청 안에서 한 번만 부르게 한다. */
export const loadTrip = cache(async (slug: string) => {
  const { serverApi } = await import('@/lib/api/server');
  return fetchTrip(await serverApi(), slug);
});
