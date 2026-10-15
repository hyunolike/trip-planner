import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { airportGuide, trip } from '../src/data.js';

describe('trip data', () => {
  it('uses the selected Friday tour and distinguishes supplier times from family plans', () => {
    const day = trip.days[2];
    expect(day.date).toBe('2026-10-23');
    const stops = new Map(day.stops.map(stop => [stop.id, stop]));
    expect(stops.get('d3-depart')).toMatchObject({ time: '09:50', timing: '상품 안내' });
    expect(stops.get('d3-amanohashidate').time).toBe('11:20');
    expect(stops.get('d3-ine').time).toBe('14:30');
    expect(stops.get('d3-returnbus').time).toBe('15:50');
    expect(stops.get('d3-arrive').time).toBe('18:20');
    expect(stops.get('d3-lunch').timing).toBe('가족 계획');
    expect(day.tour.excluded).toContain('점심');
    expect(day.tour.fees[1].adult).toContain('1,200');
    expect(day.tour.fees[1].source.url).toContain('tankai.jp');
  });
  it('contains the confirmed four-day itinerary and both flights', () => {
    expect(trip.days).toHaveLength(4);
    expect(trip.days.map((day) => day.date)).toEqual([
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
    ]);
    expect(trip.flights.outbound).toMatchObject({ from: 'GMP', to: 'KIX', depart: '08:10', arrive: '09:50' });
    expect(trip.flights.return).toMatchObject({ from: 'KIX', to: 'GMP', depart: '20:30', arrive: '22:25' });
  });

  it('keeps breakfast on days 2, 3 and 4 and restaurant choices for meals', () => {
    for (const day of trip.days.slice(1)) {
      expect(day.stops.some((stop) => stop.type === 'breakfast')).toBe(true);
    }
    expect(trip.days.flatMap((day) => day.stops).filter((stop) => stop.restaurant).length).toBeGreaterThanOrEqual(7);
  });

  it('uses Arashiyama Kijurou for the Kyoto lunch and gives map coordinates to each day', () => {
    const day2Lunch = trip.days[1].stops.find((stop) => stop.id === 'd2-lunch');
    expect(day2Lunch.restaurant).toMatchObject({
      name: '아라시야마 키주로',
      english: 'Arashiyama Kijurou',
    });
    expect(day2Lunch.restaurant.note).toContain('예약 불가');
    expect(day2Lunch.restaurant.link.url).toContain('tabelog.com');
    for (const day of trip.days) {
      expect(day.stops.filter((stop) => stop.coordinates).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('orders the Kyoto first-day stops as luggage drop, lunch, bamboo grove, then Tenryuji', () => {
    const stops = trip.days[1].stops;
    const order = ['d2-hotel', 'd2-arashiyama', 'd2-lunch', 'd2-chikurin', 'd2-tenryuji'];
    const indexes = order.map((id) => stops.findIndex((stop) => stop.id === id));

    expect(indexes.every((index) => index >= 0)).toBe(true);
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
    expect(stops.find((stop) => stop.id === 'd2-chikurin').title).toContain('치쿠린');
    expect(stops.find((stop) => stop.id === 'd2-tenryuji').title).toBe('텐류지');
    expect(stops.find((stop) => stop.id === 'd2-tenryuji').photo).toBeDefined();
  });

  it('visits Fushimi Inari on the last day before lunch and the airport train', () => {
    const stops = trip.days[3].stops;
    const order = ['d4-breakfast', 'd4-fushimi', 'd4-fushimi-return', 'd4-lunch', 'd4-luggage', 'd4-haruka'];
    const indexes = order.map((id) => stops.findIndex((stop) => stop.id === id));

    expect(indexes.every((index) => index >= 0)).toBe(true);
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
    expect(stops.find((stop) => stop.id === 'd4-fushimi').photo).toBeDefined();
  });

  it('uses Ichiran Kyoto Kawaramachi for dinner and defines public-transit route legs', () => {
    const day2 = trip.days[1];
    const dinner = day2.stops.find((stop) => stop.id === 'd2-dinner');
    expect(dinner.restaurant).toMatchObject({
      name: '이치란 교토 가와라마치점',
      english: 'ICHIRAN Kyoto Kawaramachi',
    });
    expect(dinner.restaurant.note).toContain('독립형 카운터');
    expect(dinner.restaurant.alternatives.join(' ')).toContain('기온 카료');
    expect(dinner.restaurant.link.url).toContain('ichiran.com/shop/kinki/kyoto-kawaramachi');
    expect(day2.stops.filter((stop) => stop.transit).length).toBeGreaterThanOrEqual(8);
  });

  it('includes Visit Japan Web and realistic recommended airport arrival times', () => {
    expect(airportGuide.visitJapan.steps.length).toBeGreaterThanOrEqual(4);
    expect(airportGuide.gimpo.recommendedArrival).toBe('06:00');
    expect(airportGuide.kansai.recommendedArrival).toBe('17:30–18:00');
  });

  it('provides licensed photos for the headline sights', () => {
    const photoStops = trip.days.flatMap((day) => day.stops).filter((stop) => stop.photo);

    expect(photoStops.map((stop) => stop.id)).toEqual([
      'd1-castle',
      'd1-harukas',
      'd1-dotonbori-walk',
      'd1-cruise',
      'd2-chikurin',
      'd2-tenryuji',
      'd2-kiyomizu',
      'd3-amanohashidate',
      'd3-ine',
      'd4-fushimi',
    ]);

    for (const { photo } of photoStops) {
      expect(photo).toMatchObject({
        src: expect.stringMatching(/^(\/images\/places\/.+\.(webp|jpg)|https:\/\/upload\.wikimedia\.org\/)/),
        alt: expect.any(String),
        credit: expect.any(String),
        license: expect.any(String),
        source: expect.stringContaining('commons.wikimedia.org/wiki/File:'),
        licenseUrl: expect.stringMatching(/^https?:\/\//),
      });
      if (photo.src.startsWith('/')) {
        expect(existsSync(resolve(process.cwd(), `public${photo.src}`))).toBe(true);
      }
    }
  });
});
