/** Bound each attempt. Only GET/HEAD may retry once after a temporary gateway error.
 * A lost write response is ambiguous; leave reconciliation to the edit queue.
 */
export function boundedFetch(fetcher: typeof fetch, timeoutMs = 15_000): typeof fetch {
  return async (input, init) => {
    const original = new Request(input, init);
    const safe = original.method === 'GET' || original.method === 'HEAD';
    for (let attempt = 0; ; attempt++) {
      const signal = AbortSignal.any([original.signal, AbortSignal.timeout(timeoutMs)]);
      const response = await fetcher(new Request(original.clone(), { signal }));
      if (!safe || attempt > 0 || ![502, 503, 504].includes(response.status)) return response;
      await response.body?.cancel();
      await new Promise<void>((resolve, reject) => {
        const abort = () => {
          clearTimeout(timer);
          reject(original.signal.reason);
        };
        const timer = setTimeout(() => {
          original.signal.removeEventListener('abort', abort);
          resolve();
        }, 1_000);
        if (original.signal.aborted) abort();
        else original.signal.addEventListener('abort', abort, { once: true });
      });
    }
  };
}
