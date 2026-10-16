import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it('does not configure backend rewrites for the disconnected UI preview', async () => {
  vi.stubEnv('TRIPNOTE_UI_PREVIEW', '1');
  const { default: config } = await import('../next.config');
  expect(await config.rewrites?.()).toEqual([]);
});

it('preserves API proxy routes when the preview switch is off', async () => {
  vi.stubEnv('TRIPNOTE_UI_PREVIEW', '');
  const { default: config } = await import('../next.config');
  expect(await config.rewrites?.()).toEqual(
    expect.arrayContaining([expect.objectContaining({ source: '/api/:path*' })]),
  );
});
