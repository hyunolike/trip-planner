import { NextRequest } from 'next/server';
import { afterEach, expect, it, vi } from 'vitest';
import { proxy } from './proxy';

afterEach(() => vi.unstubAllEnvs());

it('blocks disconnected preview API calls without contacting a backend', async () => {
  vi.stubEnv('TRIPNOTE_UI_PREVIEW', '1');
  const response = proxy(new NextRequest('https://preview.example/api/v1/auth/login', { method: 'POST' }));
  expect(response.status).toBe(503);
  expect(response.headers.get('x-middleware-rewrite')).toBeNull();
  expect(await response.json()).toMatchObject({ code: 'backend_unavailable' });
});

it('replaces a direct private/auth page URL with the notice and drops its query', () => {
  vi.stubEnv('TRIPNOTE_UI_PREVIEW', '1');
  const response = proxy(new NextRequest('https://preview.example/t/private-trip?token=private'));
  expect(response.headers.get('x-middleware-rewrite')).toBe('https://preview.example/preview');
  expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
});

it('serves only the notice assets in preview mode', () => {
  vi.stubEnv('TRIPNOTE_UI_PREVIEW', '1');
  expect(
    proxy(new NextRequest('https://preview.example/_next/static/font.woff2')).headers.get('x-middleware-next'),
  ).toBe('1');
  expect(proxy(new NextRequest('https://preview.example/images/private.jpg')).headers.get('x-middleware-rewrite')).toBe(
    'https://preview.example/preview',
  );
});

it('leaves application routing unchanged when preview mode is off', () => {
  vi.stubEnv('TRIPNOTE_UI_PREVIEW', '');
  expect(proxy(new NextRequest('https://preview.example/login')).headers.get('x-middleware-next')).toBe('1');
});

it('rejects direct server-action submissions outside the API routes in preview mode', () => {
  vi.stubEnv('TRIPNOTE_UI_PREVIEW', '1');
  const response = proxy(new NextRequest('https://preview.example/trips/new', { method: 'POST' }));
  expect(response.status).toBe(503);
  expect(response.headers.get('x-middleware-rewrite')).toBeNull();
});
