'use client';

import createClient, { type Middleware } from 'openapi-fetch';
import { CSRF_COOKIE, CSRF_HEADER, isUnsafe, readCookie } from './csrf';
import type { paths } from './schema';

type Options = { baseUrl?: string; fetch?: typeof fetch; cookie?: () => string };

export function createBrowserApi(options: Options = {}) {
  const baseUrl = options.baseUrl ?? globalThis.location?.origin ?? 'http://localhost';
  const fetcher = options.fetch ?? ((input: RequestInfo | URL, init?: RequestInit) => globalThis.fetch(input, init));
  const cookie = options.cookie ?? (() => document.cookie);

  let priming: Promise<void> | null = null;
  function prime(force: boolean): Promise<void> {
    if (!force && readCookie(CSRF_COOKIE, cookie())) return Promise.resolve();
    priming ??= fetcher(new Request(`${baseUrl}/api/v1/auth/csrf`, { credentials: 'same-origin' }))
      .then(() => undefined)
      .finally(() => {
        priming = null;
      });
    return priming;
  }

  function withToken(request: Request): Request {
    const token = readCookie(CSRF_COOKIE, cookie());
    if (token) request.headers.set(CSRF_HEADER, token);
    return request;
  }

  // 요청 본문은 한 번 보내면 다시 읽을 수 없으므로, 403 재시도에 쓸 사본을 보내기 전에 떠 둔다.
  const copies = new Map<string, Request>();

  const csrf: Middleware = {
    async onRequest({ request, id }) {
      if (!isUnsafe(request.method)) return request;
      await prime(false);
      const prepared = withToken(request);
      copies.set(id, prepared.clone());
      return prepared;
    },
    async onResponse({ response, id }) {
      const copy = copies.get(id);
      copies.delete(id);
      if (!copy || response.status !== 403) return response;
      await prime(true);
      return fetcher(withToken(copy));
    },
    onError({ id }) {
      copies.delete(id);
    },
  };

  const client = createClient<paths>({ baseUrl, fetch: fetcher, credentials: 'same-origin' });
  client.use(csrf);
  return client;
}

export const api = createBrowserApi();
