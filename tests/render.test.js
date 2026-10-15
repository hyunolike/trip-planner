/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { renderAirportGuide, renderApp, renderDay, renderRouteMap } from '../src/render.js';
import { trip, airportGuide } from '../src/data.js';

describe('rendering', () => {
  it('renders the destination photograph and accessible trip route', () => {
    const html = renderRouteMap(trip, 1);
    expect(html).toContain('alt="오사카성"');
    expect(html).toContain('/images/places/osaka-castle.webp');
    expect(html).toContain('class="journey-route"');
    expect(html).toContain('JR 신쾌속');
    expect(html).toContain('aria-label="전체 여행 경로"');
  });

  it('renders restaurants, external source links and stop controls', () => {
    const html = renderDay(trip.days[0], { completedStops: [], day4Option: null });
    expect(html).toContain('이즈모우나기 루쿠아점');
    expect(html).toContain('본쿠라야 PLUS');
    expect(html).toContain('data-stop-id="d1-kix"');
    expect(html).toContain('rel="noreferrer"');
  });

  it('renders the map mode and map-focus controls for located stops', () => {
    const day = renderDay(trip.days[1], { completedStops: [], day4Option: null });
    const app = renderApp(trip, airportGuide, 1, { completedStops: [], day4Option: null }, false, true);
    expect(day).toContain('아라시야마 키주로');
    expect(day).toContain('data-map-stop="d2-lunch"');
    expect(app).toContain('class="map-button"');
    expect(app).toContain('이동 지도');
    expect(app).toContain('id="trip-map"');
    expect(app).toContain('날짜별 이동 경로');
    expect(app).toContain('data-map-play');
    expect(app).toContain('경로 따라보기');
    expect(app).toContain('전철');
    expect(app).toContain('버스');
  });

  it('renders linked destination slides with manual carousel controls', () => {
    const html = renderRouteMap(trip, 0);

    expect(trip.heroSlides).toHaveLength(9);
    expect(html).toContain('data-hero-carousel');
    expect(html).toContain('data-hero-next');
    expect(html).toContain('data-hero-prev');
    expect(html).not.toContain('data-hero-pause');
    expect(trip.heroSlides[3].blogUrl).toBe('https://www.japan-guide.com/e/e3913.html');
    expect(trip.heroSlides.some(slide => slide.place === '텐류지 소겐치 정원')).toBe(true);
    expect(html).toContain('여행지 소개');
  });

  it('renders compact mobile action labels without weakening accessible names', () => {
    document.body.innerHTML = renderApp(
      trip,
      airportGuide,
      0,
      { completedStops: [], day4Option: null },
    );

    const mapButton = document.querySelector('.map-button');
    const airportButton = document.querySelector('.airport-button');
    const firstTime = document.querySelector('.timeline-stop .time-ticket');

    expect(mapButton.getAttribute('aria-label')).toBe('가족 이동 지도 열기');
    expect(mapButton.querySelector('.action-label-wide').textContent).toBe('이동 지도');
    expect(mapButton.querySelector('.action-label-short').textContent).toBe('지도');
    expect(airportButton.getAttribute('aria-label')).toBe('입국·출국 공항 가이드 열기');
    expect(airportButton.querySelector('.action-label-wide').textContent).toBe('공항 가이드');
    expect(airportButton.querySelector('.action-label-short').textContent).toBe('공항');
    expect(firstTime.textContent).toContain(trip.days[0].stops[0].time);
  });

  it('renders Ichiran as the Kyoto dinner recommendation', () => {
    const html = renderDay(trip.days[1], { completedStops: [], day4Option: null });
    expect(html).toContain('이치란 교토 가와라마치점');
    expect(html).toContain('기온 카료');
  });

  it('renders lazy-loaded sight postcards with visible source and license links', () => {
    const html = renderDay(trip.days[0], { completedStops: [], day4Option: null });

    expect(html).toContain('<figure class="place-photo');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
    expect(html).toContain('밤의 도톤보리 운하와 글리코상 네온사인');
    expect(html).toContain('사진: Martin Falbisoner');
    expect(html).toContain('CC BY-SA 4.0');
    expect(html).toContain('commons.wikimedia.org/wiki/File:');
  });

  it('renders Tenryuji with a bundled photo so the itinerary does not depend on a remote thumbnail', () => {
    const html = renderDay(trip.days[1], { completedStops: [], day4Option: null });

    expect(html).toContain('src="/images/places/tenryuji-garden.jpg"');
    expect(html).toContain('교토 아라시야마 텐류지 소겐치 정원과 연못');
    expect(html).toContain('663highland');
    expect(html).toContain('CC BY-SA 3.0');
  });

  it('renders Visit Japan Web and both airport procedures', () => {
    const html = renderAirportGuide(airportGuide);
    expect(html).toContain('Visit Japan Web');
    expect(html).toContain('06:00');
    expect(html).toContain('17:30–18:00');
    expect(html).toContain('입국');
    expect(html).toContain('출국');
  });

  it('keeps map date choices compact and readable on phones', () => {
    const app = renderApp(trip, airportGuide, 0, { completedStops: [], day4Option: null }, false, true);
    expect(app).toContain('aria-label="DAY 3, 10.23 금, KYOTO NORTH 일정 보기"');
    expect(app).toContain('<span>DAY 03</span><small>10.23 금</small>');
    expect(app).toContain('가족 여행 · 10.21 수');
    expect(app).toContain('날짜별 이동 경로');
    expect(app).toContain('ti ti-train');
    expect(app).toContain('ti ti-bus');
    expect(app).not.toContain('LIVE FAMILY ROUTE');
  });

  it('renders the service logo and install guide for iPhone and Android', () => {
    const ios = renderApp(trip, airportGuide, 0, { completedStops: [], day4Option: null }, false, false, true, 'ios');
    const android = renderApp(trip, airportGuide, 0, { completedStops: [], day4Option: null }, false, false, true, 'android', true);

    expect(ios).toContain('src="/icons/tripnote.svg"');
    expect(ios).toContain('홈 화면에 추가하기');
    expect(ios).toContain('Safari 하단의 공유 버튼');
    expect(android).toContain('Chrome 오른쪽 위 ⋮ 메뉴');
    expect(android).toContain('홈 화면에 추가');
    expect(android).toContain('data-native-install');
  });
});
