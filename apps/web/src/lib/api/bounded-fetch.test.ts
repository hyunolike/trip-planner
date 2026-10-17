import { afterEach, describe, expect, it, vi } from 'vitest';
import { boundedFetch } from './bounded-fetch';

afterEach(() => vi.useRealTimers());
describe('boundedFetch', () => {
  it('retries a temporary read once, preserving cookies', async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ ok: true }));
    const pending = boundedFetch(fetcher)('https://example.test/api', { headers: { cookie: 'test-only=fixture' } });
    await vi.advanceTimersByTimeAsync(1_000);
    expect((await pending).status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(2);
    const retried = fetcher.mock.calls[1]?.[0] as Request | undefined;
    expect(retried?.headers.get('cookie')).toBe('test-only=fixture');
  });
  it('does not replay a write on a gateway failure', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 503 }));
    expect((await boundedFetch(fetcher)('https://example.test/api', { method: 'POST', body: '{}' })).status).toBe(503);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('does not replay an ambiguous network failure', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline'));
    await expect(boundedFetch(fetcher)('https://example.test/api', { method: 'PATCH' })).rejects.toThrow('offline');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('bounds a stuck connection', async () => {
    const fetcher: typeof fetch = async (input) =>
      new Promise((_, reject) => {
        (input as Request).signal.addEventListener('abort', () => reject((input as Request).signal.reason));
      });
    await expect(boundedFetch(fetcher, 10)('https://example.test/api')).rejects.toHaveProperty('name', 'TimeoutError');
  });
});
