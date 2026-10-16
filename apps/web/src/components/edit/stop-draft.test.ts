import { osakaTrip } from '@test/fixtures/trip';
import { expect, it } from 'vitest';
import { defaultStopTime, stopDraftBody, toStopDraft } from './stop-draft';

it('defaults time from the preceding stop plus its Korean duration', () => {
  expect(defaultStopTime({ time: '09:30', duration: '1시간 20분' })).toBe('10:50');
  expect(defaultStopTime({ time: '23:30', duration: '2시간' })).toBe('01:30');
  expect(defaultStopTime()).toBe('09:00');
});

it('preserves all existing links and their notes when editing unrelated stop fields', () => {
  const stop = osakaTrip().days[0]!.stops[0]!;
  stop.links = [
    { label: '예약', url: 'https://example.com/book', note: '예약 번호 ABC' },
    { label: '안내', url: 'https://example.com/guide', note: '입구 확인' },
  ];
  expect(stopDraftBody({ ...toStopDraft(stop), title: '바뀐 제목' }).links).toEqual(stop.links);
});

it('accepts a title-only stop while rejecting unsafe links and partial coordinates', () => {
  expect(
    stopDraftBody({
      title: '  점심  ',
      time: '',
      type: '',
      duration: '',
      details: '',
      buffer: '',
      latitude: '',
      longitude: '',
      linkLabel: '',
      linkUrl: '',
    }),
  ).toMatchObject({ title: '점심', time: '09:00' });
  const draft = {
    title: '점심',
    time: '12:00',
    type: '',
    duration: '',
    details: '',
    buffer: '',
    latitude: '37',
    longitude: '',
    linkLabel: '예약',
    linkUrl: 'javascript:alert(1)',
  };
  expect(() => stopDraftBody(draft)).toThrow();
  expect(() => stopDraftBody({ ...draft, linkUrl: 'https://example.com' })).toThrow('위도와 경도');
});
