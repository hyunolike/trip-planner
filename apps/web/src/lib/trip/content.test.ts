import { danangTrip, osakaTrip } from '@test/fixtures/trip';
import { describe, expect, it } from 'vitest';
import { readPhoto, readTrip, safeHref } from './content';

describe('readTrip', () => {
  it('keeps every day, stop and place of the Osaka Kyoto original in order', () => {
    const trip = readTrip(osakaTrip());

    expect(trip.days.map((d) => d.number)).toEqual([1, 2, 3, 4]);
    expect(trip.days.flatMap((d) => d.stops)).toHaveLength(50);
    expect(trip.places).toHaveLength(16);
    expect(trip.days[0]?.stops[0]?.key).toBe(osakaTrip().days[0]?.stops[0]?.key);
    expect(trip.content.checklistGroups.length).toBeGreaterThan(0);
    expect(trip.content.linkGroups.length).toBe(3);
    expect(trip.content.sections.map((s) => s.id)).toEqual([
      'overview',
      'airport',
      'food',
      'shopping',
      'links',
      'preparation',
    ]);
  });

  it('reads stop links, photos, guides and transit into typed values', () => {
    const stops = readTrip(osakaTrip()).days.flatMap((d) => d.stops);
    const kix = stops.find((s) => s.key === 'd1-kix');

    expect(kix?.coordinates).toEqual([34.4347, 135.244]);
    expect(kix?.transit).toEqual({
      mode: 'flight',
      label: '아시아나항공',
      icon: '✈️',
      waypoints: [
        [36.3, 130.8],
        [35.2, 133.8],
      ],
    });
    expect(kix?.links[0]).toEqual({
      label: '간사이공항 입국 동선',
      url: 'https://www.kansai-airport.or.jp/en/flight/route/t1_arr',
    });
    expect(stops.filter((s) => s.guide).length).toBe(27);
    const facts = stops.flatMap((s) => s.guide?.blocks ?? []).find((b) => b.type === 'facts');
    expect(facts).toMatchObject({
      type: 'facts',
      items: [
        { label: '출발', value: '우메다 점심 후' },
        { label: '이동', value: '다니마치선 · 도보' },
      ],
    });
    expect(stops.find((s) => s.photo)?.photo?.src).toMatch(/^\/images\//);
  });

  it('gives a trip without legacy sections empty lists instead of undefined', () => {
    const trip = readTrip(danangTrip());

    expect(trip.content.sections).toEqual([]);
    expect(trip.content.coverPhoto?.src).toMatch(/^https:\/\/upload\.wikimedia\.org\//);
    expect(trip.days).toHaveLength(5);
  });

  it('drops links, photos and coordinates that are unsafe or malformed', () => {
    const doc = osakaTrip();
    const stop = doc.days[0]!.stops[0]!;
    stop.links = [
      { label: '스크립트', url: 'javascript:alert(1)' },
      { label: '데이터', url: 'data:text/html,<script>alert(1)</script>' },
      { label: '정상', url: 'https://example.com' },
      { label: '', url: 'https://example.com/empty-label' },
    ];
    stop.photo = { src: 'javascript:alert(1)', alt: 'x' };
    stop.coordinates = [135.5, 34.6, 1];

    const view = readTrip(doc).days[0]!.stops[0]!;

    expect(view.links).toEqual([{ label: '정상', url: 'https://example.com' }]);
    expect(view.photo).toBeUndefined();
    expect(view.coordinates).toBeUndefined();
  });
});

describe('safeHref and readPhoto', () => {
  it('allows web, mail, phone, site-relative and anchor links only', () => {
    expect(safeHref('https://a.example')).toBe('https://a.example');
    expect(safeHref('http://a.example')).toBe('http://a.example');
    expect(safeHref('mailto:a@b.c')).toBe('mailto:a@b.c');
    expect(safeHref('tel:+81-6-1234')).toBe('tel:+81-6-1234');
    expect(safeHref('/images/a.jpg')).toBe('/images/a.jpg');
    expect(safeHref('#preparation')).toBe('#preparation');
    expect(safeHref('//evil.example/x')).toBeUndefined();
    expect(safeHref(' JavaScript:alert(1)')).toBeUndefined();
    expect(safeHref(42)).toBeUndefined();
    expect(safeHref('/\\evil.example')).toBeUndefined();
    expect(safeHref('/\t/evil.example')).toBeUndefined();
    expect(safeHref('\\\\evil.example')).toBeUndefined();
  });

  it('needs a safe image source and alt text', () => {
    expect(readPhoto({ src: '/images/a.jpg', alt: '오사카성' })).toEqual({ src: '/images/a.jpg', alt: '오사카성' });
    expect(readPhoto({ src: 'mailto:a@b.c', alt: 'x' })).toBeUndefined();
    expect(readPhoto({ src: '/images/a.jpg' })).toBeUndefined();
    expect(readPhoto({ src: 'data:image/svg+xml,<svg/>', alt: 'x' })).toBeUndefined();
    expect(readPhoto({ src: '//evil/x.png', alt: 'x' })).toBeUndefined();
  });
});
