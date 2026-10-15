/** @vitest-environment jsdom */
import { afterEach, expect, it, vi } from 'vitest';
import { openCastleMapViewer } from '../src/castle-map-viewer.js';
import { renderCastleCourse } from '../src/castle-course.js';
import { renderDay } from '../src/render.js';
import { trip } from '../src/data.js';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; document.body.className = ''; });

it('opens the complete station-to-castle map, fits it, zooms, resets and restores focus', () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new Event('close')); };
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function () { return this.classList.contains('castle-viewer-viewport') ? 390 : parseFloat(this.style.width) || 0; });
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function () { return this.classList.contains('castle-viewer-viewport') ? 600 : parseFloat(this.style.height) || 0; });
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function () { return parseFloat(this.style.width) || 0; });
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function () { return parseFloat(this.style.height) || 0; });
  document.body.innerHTML = renderCastleCourse();
  const opener = document.querySelector('[data-castle-map-open]');
  opener.focus();
  openCastleMapViewer(opener);
  const dialog = document.querySelector('dialog');
  expect(dialog.open).toBe(true);
  expect(dialog.querySelector('svg').getAttribute('viewBox')).toBe('0 0 1800 1273');
  expect(dialog.querySelector('svg desc').textContent).toContain('다니마치욘초메역');
  const canvas = dialog.querySelector('.castle-viewer-canvas');
  expect(parseFloat(canvas.style.width)).toBeLessThanOrEqual(390);
  expect(parseFloat(canvas.style.height)).toBeLessThanOrEqual(600);
  expect(document.querySelectorAll('#castle-inline-title')).toHaveLength(1);
  expect(document.querySelectorAll('#castle-viewer-title')).toHaveLength(1);
  expect(document.activeElement.hasAttribute('data-castle-close')).toBe(true);
  openCastleMapViewer(opener);
  expect(document.querySelectorAll('dialog')).toHaveLength(1);
  dialog.querySelector('[data-castle-zoom="in"]').click();
  expect(dialog.querySelector('output').textContent).toBe('150%');
  for (let i = 0; i < 10; i++) dialog.querySelector('[data-castle-zoom="in"]').click();
  expect(dialog.querySelector('output').textContent).toBe('400%');
  dialog.querySelector('[data-castle-zoom="fit"]').click();
  expect(dialog.querySelector('output').textContent).toBe('100%');
  expect(dialog.querySelector('[data-castle-zoom="out"]').disabled).toBe(true);
  dialog.querySelector('[data-castle-close]').click();
  expect(document.querySelector('dialog')).toBeNull();
  expect(document.activeElement).toBe(opener);
  expect(document.body.classList.contains('modal-open')).toBe(false);
});

it('keeps hotel guidance on the correct arrival and check-in stops', () => {
  const state = { completedStops: [], day4Option: null };
  const day1 = renderDay(trip.days[0], state);
  const day2 = renderDay(trip.days[1], state);
  expect(day1).toContain('5층 프런트·로비');
  expect(day1).toContain('Hotel Hankyu GRAN RESPIRE OSAKA');
  expect(day1).not.toContain('1층 프런트·로비');
  expect(day2).toContain('1층 프런트·로비');
  expect(day2).toContain('11:00까지');
  expect(day1).toContain('가족 3명의 여권 원본');
  expect(day1).toContain('예약의 선결제 여부');
});

it('fits the complete airport and JR maps to their own aspect ratio on a short screen', async () => {
  const { openIllustratedMapViewer } = await import('../src/castle-map-viewer.js');
  const { transitMaps } = await import('../src/transit-guides.js');
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.dispatchEvent(new Event('close')); };
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(300);
  document.body.innerHTML = '<button>지도 열기</button>';
  const opener = document.querySelector('button');
  for (const config of Object.values(transitMaps)) {
    openIllustratedMapViewer(opener, config);
    const dialog = document.querySelector('dialog');
    const canvas = dialog.querySelector('.castle-viewer-canvas');
    expect(parseFloat(canvas.style.height)).toBeCloseTo(300);
    expect(parseFloat(canvas.style.width) / parseFloat(canvas.style.height)).toBeCloseTo(config.size[0] / config.size[1]);
    expect(parseFloat(canvas.style.width)).toBeLessThanOrEqual(800);
    expect(dialog.querySelector('svg').getAttribute('viewBox')).toBe(`0 0 ${config.size.join(' ')}`);
    dialog.querySelector('[data-castle-zoom="in"]').click();
    expect(dialog.querySelector('output').textContent).toBe('150%');
    dialog.querySelector('[data-castle-zoom="fit"]').click();
    expect(parseFloat(canvas.style.height)).toBeCloseTo(300);
    dialog.querySelector('[data-castle-close]').click();
    expect(document.activeElement).toBe(opener);
  }
});
