import { describe, expect, it, vi } from 'vitest';
import { createServerApi } from './server-client';

describe('createServerApi', () => {
  it('calls the api origin directly and forwards the visitor cookies', async () => {
    const fetch = vi.fn(async (_input: RequestInfo | URL) => Response.json([]));
    const api = createServerApi('__Host-SESSION=abc; XSRF-TOKEN=t', { baseUrl: 'http://api.internal:8080', fetch });

    await api.GET('/api/v1/samples');

    const request = fetch.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe('http://api.internal:8080/api/v1/samples');
    expect(request.headers.get('cookie')).toBe('__Host-SESSION=abc; XSRF-TOKEN=t');
  });

  it('sends no cookie header for an anonymous visitor', async () => {
    const fetch = vi.fn(async (_input: RequestInfo | URL) => Response.json([]));
    const api = createServerApi('', { baseUrl: 'http://api.internal:8080', fetch });

    await api.GET('/api/v1/samples');

    const request = fetch.mock.calls[0]?.[0] as Request;
    expect(request.headers.has('cookie')).toBe(false);
  });
});
