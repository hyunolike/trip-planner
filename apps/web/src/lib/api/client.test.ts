import { describe, expect, it, vi } from 'vitest';
import { createBrowserApi } from './client';

const BASE = 'http://localhost:3000';

/** 쿠키 저장소와 서버를 흉내 낸다. /csrf를 부르면 토큰이 바뀐다. */
function fakeServer(options: { forbidFirstWrite?: boolean; alwaysForbid?: boolean } = {}) {
  let jar = '';
  let issued = 0;
  let writes = 0;
  const seen: { url: string; method: string; token: string | null }[] = [];
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(String(input), init);
    const url = new URL(request.url).pathname;
    seen.push({ url, method: request.method, token: request.headers.get('X-XSRF-TOKEN') });
    if (url === '/api/v1/auth/csrf') {
      issued += 1;
      jar = `XSRF-TOKEN=token-${issued}`;
      return new Response(null, { status: 204 });
    }
    if (request.method === 'GET') return Response.json({ id: 'u1', email: 'mina@example.com', nickname: '미나' });
    writes += 1;
    if (options.alwaysForbid || (options.forbidFirstWrite && writes === 1)) {
      return Response.json({ detail: '이 작업을 할 권한이 없어요.' }, { status: 403 });
    }
    return Response.json({ message: 'ok' }, { status: 202 });
  });
  return {
    fetch,
    seen,
    cookie: () => jar,
    setJar: (value: string) => {
      jar = value;
    },
  };
}

describe('createBrowserApi', () => {
  it('reads without asking for a csrf token', async () => {
    const server = fakeServer();
    const api = createBrowserApi({ baseUrl: BASE, fetch: server.fetch, cookie: server.cookie });

    await api.GET('/api/v1/me');

    expect(server.seen.map((r) => r.url)).toEqual(['/api/v1/me']);
  });

  it('fetches a token before the first write and echoes it in the header', async () => {
    const server = fakeServer();
    const api = createBrowserApi({ baseUrl: BASE, fetch: server.fetch, cookie: server.cookie });

    const { response } = await api.POST('/api/v1/auth/password-reset', { body: { email: 'mina@example.com' } });

    expect(response.status).toBe(202);
    expect(server.seen).toEqual([
      { url: '/api/v1/auth/csrf', method: 'GET', token: null },
      { url: '/api/v1/auth/password-reset', method: 'POST', token: 'token-1' },
    ]);
  });

  it('reuses an existing cookie', async () => {
    const server = fakeServer();
    server.setJar('theme=dark; XSRF-TOKEN=already');
    const api = createBrowserApi({ baseUrl: BASE, fetch: server.fetch, cookie: server.cookie });

    await api.POST('/api/v1/auth/logout');

    expect(server.seen).toEqual([{ url: '/api/v1/auth/logout', method: 'POST', token: 'already' }]);
  });

  it('refreshes the token once after a 403 and resends the same body', async () => {
    const server = fakeServer({ forbidFirstWrite: true });
    server.setJar('XSRF-TOKEN=stale');
    const api = createBrowserApi({ baseUrl: BASE, fetch: server.fetch, cookie: server.cookie });

    const { response } = await api.POST('/api/v1/auth/password-reset', { body: { email: 'mina@example.com' } });

    expect(response.status).toBe(202);
    expect(server.seen.map((r) => [r.url, r.token])).toEqual([
      ['/api/v1/auth/password-reset', 'stale'],
      ['/api/v1/auth/csrf', null],
      ['/api/v1/auth/password-reset', 'token-1'],
    ]);
    const retried = server.fetch.mock.calls.at(-1)?.[0] as Request;
    expect(await retried.json()).toEqual({ email: 'mina@example.com' });
  });

  it('gives up after one retry so a real 403 reaches the caller', async () => {
    const server = fakeServer({ alwaysForbid: true });
    server.setJar('XSRF-TOKEN=stale');
    const api = createBrowserApi({ baseUrl: BASE, fetch: server.fetch, cookie: server.cookie });

    const { response, error } = await api.POST('/api/v1/auth/logout');

    expect(response.status).toBe(403);
    expect(error).toEqual({ detail: '이 작업을 할 권한이 없어요.' });
    expect(server.seen.filter((r) => r.url === '/api/v1/auth/logout')).toHaveLength(2);
  });

  it('asks for the token only once when writes start together', async () => {
    const server = fakeServer();
    const api = createBrowserApi({ baseUrl: BASE, fetch: server.fetch, cookie: server.cookie });

    await Promise.all([api.POST('/api/v1/auth/logout'), api.POST('/api/v1/auth/logout')]);

    expect(server.seen.filter((r) => r.url === '/api/v1/auth/csrf')).toHaveLength(1);
  });
});
