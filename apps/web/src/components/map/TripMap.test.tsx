import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type Ref, useImperativeHandle } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mapProps: Record<string, unknown>[] = [];
const fitBounds = vi.fn();

vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));
vi.mock('maplibre-gl', () => ({ setWorkerUrl: vi.fn() }));
vi.mock('react-map-gl/maplibre', () => ({
  Map: (props: Record<string, unknown>) => {
    mapProps.push(props);
    useImperativeHandle(props.ref as Ref<unknown>, () => ({ fitBounds, getCenter: () => ({ lng: 135, lat: 34 }) }));
    return <button type="button" data-testid="maplibre" onClick={() => (props.onLoad as () => void)()} />;
  },
  Layer: () => null,
  Marker: () => null,
  NavigationControl: () => null,
  Source: () => null,
}));

import TripMap from './TripMap';

const points = [{ key: 'a', title: '오사카성', coordinates: [34.68, 135.52] }];

function renderMap() {
  return render(
    // biome-ignore lint/suspicious/noExplicitAny: 최소 입력만 쓰는 테스트
    <TripMap points={points as any} segments={[]} onSelect={() => {}} />,
  );
}

describe('TripMap', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    mapProps.length = 0;
    fitBounds.mockClear();
  });

  it('shows a Korean message instead of a blank map when the style request fails', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, json: async () => Promise.reject(new SyntaxError()) })),
    );
    renderMap();
    expect(await screen.findByText('지도를 불러오지 못했어요. 잠시 후 다시 열어 주세요.')).toBeInTheDocument();
    expect(screen.queryByTestId('maplibre')).not.toBeInTheDocument();
  });

  it('hands MapLibre a Korean locale', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ version: 8, sources: {}, layers: [] }) })),
    );
    renderMap();
    await waitFor(() => expect(mapProps.length).toBeGreaterThan(0));
    const locale = mapProps.at(-1)?.locale as Record<string, string>;
    expect(locale['NavigationControl.ZoomIn']).toBe('지도 확대');
    expect(locale['NavigationControl.ZoomOut']).toBe('지도 축소');
    expect(locale['CooperativeGesturesHandler.MobileHelpText']).toBe('두 손가락으로 지도를 움직여요.');
    expect(Object.values(locale).every((text) => /[가-힣]/.test(text))).toBe(true);
  });

  it('fits the new day after an already loaded map changes from Japan to Vietnam', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ version: 8, sources: {}, layers: [] }) })),
    );
    const view = renderMap();
    fireEvent.click(await screen.findByTestId('maplibre'));
    view.rerender(
      <TripMap
        points={[{ key: 'b', title: '호이안', time: '09:00', coordinates: [15.88, 108.33], approximate: false }]}
        segments={[]}
        onSelect={() => {}}
      />,
    );
    await waitFor(() =>
      expect(fitBounds).toHaveBeenLastCalledWith(
        [
          [108.33, 15.88],
          [108.33, 15.88],
        ],
        { padding: 48, maxZoom: 15, duration: 0 },
      ),
    );
  });
});
