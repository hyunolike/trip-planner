import createClient from 'openapi-fetch';
import type { paths } from './schema';

export const API_ORIGIN = process.env.API_ORIGIN ?? 'http://localhost:8080';

/** 서버 컴포넌트에서 API를 직접 부른다. 방문자의 쿠키를 그대로 넘겨 권한을 맞춘다. */
export function createServerApi(cookieHeader: string, options: { baseUrl?: string; fetch?: typeof fetch } = {}) {
  return createClient<paths>({
    baseUrl: options.baseUrl ?? API_ORIGIN,
    fetch: options.fetch,
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    cache: 'no-store',
  });
}
