/** @vitest-environment jsdom */
import { expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { renderApp } from '../src/render.js';
import { trip, airportGuide } from '../src/data.js';

it('serves crawler-readable share metadata and an actual landscape image', () => {
  const html = new DOMParser().parseFromString(readFileSync('index.html', 'utf8'), 'text/html');
  const og = property => html.querySelector(`meta[property="${property}"]`)?.content;
  expect(og('og:title')).toContain('오사카·교토 가족여행 2026');
  expect(og('og:description')).toContain('이동 지도');
  const url = new URL(og('og:image'));
  expect(url.origin).toBe(new URL(og('og:url')).origin);
  expect(existsSync(`public${url.pathname}`)).toBe(true);
  expect(og('og:image:width')).toBe('1200');
  expect(og('og:image:height')).toBe('630');
  expect(html.querySelector('meta[name="twitter:card"]').content).toBe('summary_large_image');
});

it('provides correctly sized install icons and a preview consistent with the app name', () => {
  const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
  expect(manifest.display).toBe('standalone');
  expect(manifest.short_name).toBe('여행노트');
  expect(manifest.icons.some(icon => icon.purpose === 'maskable')).toBe(true);
  for (const icon of manifest.icons) {
    const png = readFileSync(`public${icon.src}`);
    expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`).toBe(icon.sizes);
  }
  const html = renderApp(trip, airportGuide, 0, {completedStops:[],day4Option:null},false,false,true,'ios');
  expect(html).toContain('홈 화면 설치 후 예상 모습');
  expect(html).toContain('Safari');
  expect(html).toContain('/icons/tripnote-180.png');
  expect(html).toContain('여행 링크 공유하기');
});
