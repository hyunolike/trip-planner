import type { Client } from 'openapi-fetch';
import type { paths } from '@/lib/api/schema';
import type { MeResponse, TripSummary } from './content';

export async function fetchSamples(api: Client<paths>): Promise<TripSummary[] | null> {
  try {
    const { data } = await api.GET('/api/v1/samples');
    return data ?? null;
  } catch {
    return null;
  }
}

export async function fetchAccount(api: Client<paths>): Promise<{ me: MeResponse; trips: TripSummary[] } | null> {
  try {
    const { data: me } = await api.GET('/api/v1/me');
    if (!me) return null;
    const { data: trips } = await api.GET('/api/v1/trips');
    return { me, trips: trips ?? [] };
  } catch {
    return null;
  }
}
