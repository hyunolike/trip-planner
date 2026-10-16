'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { colors } from '@tripnote/design-tokens';
import { type StyleSpecification, setWorkerUrl } from 'maplibre-gl';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Layer, type MapRef, Map as MapView, Marker, NavigationControl, Source } from 'react-map-gl/maplibre';
import { Button } from '@/components/ui';
import { boundsOf, toLngLat } from '@/lib/map/geo';
import { getPlaybackZoom, type MapPoint, pointAlongPath, type RouteSegment } from '@/lib/map/route';
import { localizeLabels, routeFeatures } from '@/lib/map/style';
import type { LatLng } from '@/lib/trip/content';
import styles from './TripMap.module.css';

const STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/liberty';
const SEGMENT_MS = 2500;

// MapLibre 기본 문구는 영어라서 화면에 보이는 것을 모두 한국어로 바꾼다.
const MAP_LOCALE = {
  'AttributionControl.ToggleAttribution': '지도 출처 보기',
  'AttributionControl.MapFeedback': '지도 오류 신고',
  'FullscreenControl.Enter': '전체 화면으로 보기',
  'FullscreenControl.Exit': '전체 화면 닫기',
  'GeolocateControl.FindMyLocation': '내 위치 찾기',
  'GeolocateControl.LocationNotAvailable': '내 위치를 알 수 없어요',
  'LogoControl.Title': 'MapLibre 로고',
  'Map.Title': '지도',
  'Marker.Title': '표시',
  'NavigationControl.ResetBearing': '북쪽을 위로 맞추기',
  'NavigationControl.ZoomIn': '지도 확대',
  'NavigationControl.ZoomOut': '지도 축소',
  'Popup.Close': '닫기',
  'CooperativeGesturesHandler.WindowsHelpText': 'Ctrl 키를 누른 채 스크롤하면 지도를 확대해요.',
  'CooperativeGesturesHandler.MacHelpText': '⌘ 키를 누른 채 스크롤하면 지도를 확대해요.',
  'CooperativeGesturesHandler.MobileHelpText': '두 손가락으로 지도를 움직여요.',
};

// 운영 빌드에서는 번들러가 import.meta.url을 바꿔 MapLibre가 워커 파일을 못 찾는다. sync:images가 public/maplibre에 복사한 워커를 쓴다.
setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');

function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

class StyleUnavailable extends Error {}

type Props = {
  points: MapPoint[];
  segments: RouteSegment[];
  selectedKey?: string;
  selectionNonce?: number;
  onSelect: (key: string) => void;
};

export default function TripMap({ points, segments, selectedKey, selectionNonce, onSelect }: Props) {
  const mapRef = useRef<MapRef>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<StyleSpecification | string>();
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState<{ at: LatLng; label: string }>();
  const [visible, setVisible] = useState(true);
  const dark = useMedia('(prefers-color-scheme: dark)');
  const reduceMotion = useMedia('(prefers-reduced-motion: reduce)');
  const palette = dark ? colors.dark : colors.light;

  useEffect(() => {
    let alive = true;
    fetch(STYLE_URL)
      .then((response) => {
        if (!response.ok) throw new StyleUnavailable();
        return response.json() as Promise<StyleSpecification>;
      })
      .then((json) => alive && setStyle(localizeLabels(json)))
      .catch((error) => {
        if (!alive) return;
        if (error instanceof StyleUnavailable) setFailed(true);
        else setStyle(STYLE_URL);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)), {
      threshold: 0.3,
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const bounds = useMemo(
    () => boundsOf([...points.map((p) => p.coordinates), ...segments.flatMap((s) => s.coordinates)]),
    [points, segments],
  );
  const routes = useMemo(() => routeFeatures(segments, palette), [segments, palette]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: selectionNonce는 같은 핀을 다시 눌러도 이동하게 하는 요청 번호라 일부러 의존성에 둔다.
  useEffect(() => {
    const point = points.find((p) => p.key === selectedKey);
    if (!point) return;
    mapRef.current?.flyTo({ center: toLngLat(point.coordinates), zoom: 15, duration: reduceMotion ? 0 : 800 });
  }, [selectedKey, selectionNonce, points, reduceMotion]);

  // 경로 재생: 구간마다 SEGMENT_MS 동안 점이 선을 따라가고 카메라가 따라간다. 보이지 않거나 움직임 줄이기면 멈춘다.
  useEffect(() => {
    if (!playing || !visible || reduceMotion || !segments.length) return;
    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - started) % (SEGMENT_MS * segments.length);
      const index = Math.floor(elapsed / SEGMENT_MS);
      const segment = segments[index] as RouteSegment;
      const at = pointAlongPath(segment.coordinates, (elapsed % SEGMENT_MS) / SEGMENT_MS);
      if (at) {
        const to = points.find((p) => p.key === segment.toKey);
        setPlayhead({ at, label: `${to?.title ?? ''}(으)로 이동 중 · ${segment.label}` });
        mapRef.current?.jumpTo({ center: toLngLat(at), zoom: getPlaybackZoom(segment.mode) });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, visible, reduceMotion, segments, points]);

  function recordCenter() {
    const center = mapRef.current?.getCenter();
    if (center && frameRef.current)
      frameRef.current.dataset.center = `${center.lng.toFixed(4)},${center.lat.toFixed(4)}`;
  }

  return (
    <div ref={frameRef} className={styles.frame}>
      {failed ? (
        <div className={styles.placeholder} role="status">
          지도를 불러오지 못했어요. 잠시 후 다시 열어 주세요.
        </div>
      ) : !style ? (
        <div className={styles.placeholder}>지도를 불러오는 중이에요.</div>
      ) : (
        <MapView
          ref={mapRef}
          mapStyle={style}
          initialViewState={
            bounds ? { bounds, fitBoundsOptions: { padding: 48 } } : { longitude: 127, latitude: 37.5, zoom: 4 }
          }
          style={{ width: '100%', height: '100%' }}
          cooperativeGestures
          locale={MAP_LOCALE}
          dragRotate={false}
          attributionControl={{ compact: true }}
          onLoad={recordCenter}
          onMoveEnd={recordCenter}
        >
          <NavigationControl showCompass={false} position="top-right" />
          <Source id="route" type="geojson" data={routes}>
            <Layer
              id="route-solid"
              type="line"
              filter={['!=', ['get', 'dashed'], true]}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': ['get', 'color'], 'line-width': 4 }}
            />
            <Layer
              id="route-dashed"
              type="line"
              filter={['==', ['get', 'dashed'], true]}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': ['get', 'color'], 'line-width': 4, 'line-dasharray': [1, 2] }}
            />
          </Source>
          {points.map((point, index) => {
            const [longitude, latitude] = toLngLat(point.coordinates);
            const selected = point.key === selectedKey;
            return (
              <Marker key={point.key} longitude={longitude} latitude={latitude} anchor="center">
                <button
                  type="button"
                  className={[
                    styles.pin,
                    selected ? styles.pinSelected : '',
                    point.approximate ? styles.approximate : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-pressed={selected}
                  onClick={() => onSelect(point.key)}
                >
                  {index + 1}
                  <span className="visually-hidden">
                    번째 장소 {point.title}
                    {point.approximate ? ' (대략 위치)' : ''}
                  </span>
                </button>
              </Marker>
            );
          })}
          {playing && playhead ? (
            <Marker longitude={toLngLat(playhead.at)[0]} latitude={toLngLat(playhead.at)[1]} anchor="center">
              <span className={styles.playhead} aria-hidden="true" />
            </Marker>
          ) : null}
        </MapView>
      )}
      {segments.length ? (
        <div className={styles.controls}>
          <span className={styles.status} role="status">
            {reduceMotion
              ? '움직임 줄이기 설정이 켜져 있어 경로 재생을 껐어요.'
              : playing && playhead
                ? playhead.label
                : `${points[0]?.title ?? ''}에서 출발`}
          </span>
          {reduceMotion ? null : (
            <Button
              size="sm"
              variant={playing ? 'secondary' : 'primary'}
              aria-pressed={playing}
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? '멈추기' : '경로 재생'}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
