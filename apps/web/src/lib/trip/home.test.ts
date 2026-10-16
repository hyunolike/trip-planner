import { describe, expect, it, vi } from 'vitest';
import { createServerApi } from '@/lib/api/server-client';
import { fetchAccount, fetchSamples } from './home';

const summary = {
  slug: 'danang-hoian-family-2027',
  title: '다낭·호이안 가족여행',
  startDate: '2027-03-03',
  endDate: '2027-03-07',
  isSample: true,
  visibility: 'public',
  cities: ['DA NANG'],
  stopCount: 57,
};

function apiWith(routes: Record<string, () => Response | Promise<Response>>) {
  const fetch = vi.fn(async (input: RequestInfo | URL) => {
    const path = new URL((input as Request).url).pathname;
    const route = routes[path];
    return route ? route() : new Response(null, { status: 404 });
  });
  return createServerApi('__Host-SESSION=abc', { baseUrl: 'http://api.test', fetch });
}

describe('fetchSamples', () => {
  it('returns the public samples', async () => {
    expect(await fetchSamples(apiWith({ '/api/v1/samples': () => Response.json([summary]) }))).toEqual([summary]);
  });

  it('returns null when the api fails', async () => {
    expect(await fetchSamples(apiWith({ '/api/v1/samples': () => new Response(null, { status: 503 }) }))).toBeNull();
    expect(await fetchSamples(apiWith({ '/api/v1/samples': () => Promise.reject(new TypeError('down')) }))).toBeNull();
  });
});

describe('fetchAccount', () => {
  it('returns null for a visitor who is not signed in', async () => {
    expect(
      await fetchAccount(
        apiWith({ '/api/v1/me': () => Response.json({ detail: '로그인이 필요해요.' }, { status: 401 }) }),
      ),
    ).toBeNull();
  });

  it('returns the profile and their trips', async () => {
    const me = { id: 'u1', email: 'mina@example.com', nickname: '미나' };
    const account = await fetchAccount(
      apiWith({
        '/api/v1/me': () => Response.json(me),
        '/api/v1/trips': () => Response.json([{ ...summary, isSample: false, visibility: 'private' }]),
      }),
    );
    expect(account?.me).toEqual(me);
    expect(account?.trips).toHaveLength(1);
  });
});
