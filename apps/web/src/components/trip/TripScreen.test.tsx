import { danangTrip, osakaTrip } from '@test/fixtures/trip';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readTrip } from '@/lib/trip/content';
import { TripScreen } from './TripScreen';

const osaka = readTrip(osakaTrip());
const day1 = osaka.days[0]!;
const day2 = osaka.days[1]!;

describe('TripScreen', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/t/osaka-kyoto-family-2026');
  });

  it('shows the trip header with dates, length and a read-only badge', () => {
    render(<TripScreen trip={osaka} initialDay={0} />);

    expect(screen.getByRole('heading', { level: 1, name: osaka.title })).toBeInTheDocument();
    expect(screen.getByText('2026.10.21 – 10.24 · 4일')).toBeInTheDocument();
    expect(screen.getByText('보기 전용')).toBeInTheDocument();
    const travelers = within(screen.getByRole('list', { name: '함께 가는 사람' })).getAllByRole('listitem');
    expect(travelers.map((li) => li.textContent)).toEqual(['👩 엄마', '👨 아빠', '👦 아들']);
  });

  it('marks a researched sample as an example', () => {
    render(<TripScreen trip={readTrip(danangTrip())} initialDay={0} />);
    expect(screen.getByText('샘플 일정')).toBeInTheDocument();
    expect(screen.getByText(/여러 여행 상품을 참고해 새로 짠 예시 일정이에요/)).toBeInTheDocument();
  });

  it('lists every stop of the selected day in order', () => {
    render(<TripScreen trip={osaka} initialDay={0} />);
    const list = screen.getByRole('list', { name: '1일차 일정' });

    // 이관 HTML 가이드 안에도 h3가 있으므로 행마다 첫 h3만 읽는다.
    const titles = [...list.querySelectorAll(':scope > li')].map((li) => li.querySelector('h3')?.textContent);
    expect(titles).toEqual(day1.stops.map((s) => s.title));
    expect(screen.getByRole('heading', { level: 2, name: day1.theme })).toBeInTheDocument();
  });

  it('switches days from the day bar and keeps the choice in the address', async () => {
    window.history.replaceState(null, '', '/t/osaka-kyoto-family-2026#itinerary');
    render(<TripScreen trip={osaka} initialDay={0} />);
    const bar = screen.getByRole('navigation', { name: '날짜 선택' });

    await userEvent.click(within(bar).getByRole('button', { name: /2일차/ }));

    expect(within(bar).getByRole('button', { name: /2일차/ })).toHaveAttribute('aria-current', 'date');
    expect(screen.getByRole('heading', { level: 2, name: day2.theme })).toBeInTheDocument();
    expect(window.location.search).toBe('?day=2');
    expect(window.location.hash).toBe('#itinerary');
  });

  it('opens every stop detail in detail mode', async () => {
    const { container } = render(<TripScreen trip={osaka} initialDay={0} />);
    expect(container.querySelectorAll('details[data-stop-detail][open]')).toHaveLength(0);

    await userEvent.click(screen.getByRole('button', { name: '상세 일정' }));

    expect(container.querySelectorAll('details[data-stop-detail][open]')).toHaveLength(day1.stops.length);
  });

  it('checks a stop, counts it, remembers it and can hide it', async () => {
    render(<TripScreen trip={osaka} initialDay={0} />);
    const first = day1.stops[0]!;

    await userEvent.click(screen.getByRole('button', { name: `일정 완료 표시: ${first.title}` }));

    expect(screen.getByRole('button', { name: `일정 완료 표시: ${first.title}` })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText(`1 / ${day1.stops.length} 완료`)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('tripnote:completion:v1:osaka-kyoto-family-2026') ?? '{}').stops).toEqual([
      first.key,
    ]);

    await userEvent.click(screen.getByRole('button', { name: '완료한 일정 숨기기' }));
    expect(screen.queryByRole('heading', { level: 3, name: first.title })).not.toBeInTheDocument();
  });

  it('links a located stop to Google Maps and shows its details', async () => {
    const { container } = render(<TripScreen trip={osaka} initialDay={0} />);
    const kix = day1.stops.find((s) => s.key === 'd1-kix')!;
    const row = container.querySelector('#stop-d1-kix') as HTMLElement;

    await act(async () => {
      row.querySelector('summary')?.click();
    });

    expect(row.querySelector('details')).toHaveAttribute('open');
    expect(within(row).getByRole('link', { name: /Google 지도/ })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=34.4347%2C135.244',
    );
    expect(within(row).getByText(kix.details)).toBeInTheDocument();
  });

  it('calls onLocate when the location button is pressed', async () => {
    const onLocate = vi.fn();
    render(<TripScreen trip={osaka} initialDay={0} onLocate={onLocate} />);
    const kix = day1.stops.find((s) => s.key === 'd1-kix')!;

    await userEvent.click(screen.getByRole('button', { name: `${kix.title} 지도에서 보기` }));

    expect(onLocate).toHaveBeenCalledWith('d1-kix');
  });
});
