import { osakaTrip } from '@test/fixtures/trip';
import { describe, expect, it, vi } from 'vitest';
import { createServerApi } from '@/lib/api/server-client';
import { fetchTrip } from './load';

const api = (respond: () => Response | Promise<Response>) => {
  const fetch = vi.fn(async () => respond());
  return { fetch, client: createServerApi('', { baseUrl: 'http://api.test', fetch }) };
};

describe('fetchTrip', () => {
  it('returns the document on 200', async () => {
    const { client } = api(() => Response.json(osakaTrip()));
    const result = await fetchTrip(client, 'osaka-kyoto-family-2026');
    expect(result.kind).toBe('ok');
  });

  it('treats 404 as missing, which also covers private trips', async () => {
    const { client } = api(() => Response.json({ detail: '일정을 찾을 수 없어요.' }, { status: 404 }));
    expect(await fetchTrip(client, 'someone-elses-trip')).toEqual({ kind: 'missing' });
  });

  it('treats server errors and network failures as unavailable', async () => {
    expect(await fetchTrip(api(() => new Response('boom', { status: 500 })).client, 'a')).toEqual({
      kind: 'unavailable',
    });
    expect(await fetchTrip(api(() => Promise.reject(new TypeError('fetch failed'))).client, 'a')).toEqual({
      kind: 'unavailable',
    });
  });

  it('does not call the api for a slug that cannot exist', async () => {
    const { client, fetch } = api(() => Response.json({}));
    expect(await fetchTrip(client, '../../me')).toEqual({ kind: 'missing' });
    expect(await fetchTrip(client, 'a'.repeat(101))).toEqual({ kind: 'missing' });
    expect(fetch).not.toHaveBeenCalled();
  });
});
