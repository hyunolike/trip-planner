import { danangTrip, osakaTrip } from '@test/fixtures/trip';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { readTrip } from '@/lib/trip/content';
import { TripScreen } from './TripScreen';

const osaka = readTrip(osakaTrip());

async function goTo(hash: string) {
  await act(async () => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

describe('trip sections', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/t/osaka-kyoto-family-2026');
  });

  it('offers the five sections and starts on the itinerary', () => {
    render(<TripScreen trip={osaka} initialDay={0} />);
    const nav = screen.getByRole('navigation', { name: '여행 노트 섹션' });

    expect(
      within(nav)
        .getAllByRole('link')
        .map((a) => a.textContent),
    ).toEqual(['일정', '맛집', '쇼핑', '링크', '준비']);
    expect(within(nav).getByRole('link', { name: '일정' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('navigation', { name: '날짜 선택' })).toBeInTheDocument();
  });

  it('shows dining and shopping candidates as place cards', async () => {
    render(<TripScreen trip={osaka} initialDay={0} />);

    await goTo('#food');
    expect(screen.getByRole('heading', { level: 2, name: '맛집 후보' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(osaka.places.filter((p) => p.kind === 'dining').length);
    expect(screen.queryByRole('navigation', { name: '날짜 선택' })).not.toBeInTheDocument();

    await goTo('#shopping');
    expect(screen.getByRole('heading', { level: 2, name: '쇼핑 후보' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(osaka.places.filter((p) => p.kind === 'shopping').length);
  });

  it('groups booking and official links', async () => {
    render(<TripScreen trip={osaka} initialDay={0} />);
    await goTo('#links');

    const groups = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(groups).toEqual(osaka.content.linkGroups.map((g) => g.label));
    expect(screen.getAllByRole('link', { name: /새 창/ }).length).toBeGreaterThan(10);
  });

  it('checks preparation items and remembers them', async () => {
    render(<TripScreen trip={osaka} initialDay={0} />);
    await goTo('#preparation');
    const first = osaka.content.checklistGroups[0]!.items[0]!;

    await userEvent.click(screen.getByRole('checkbox', { name: new RegExp(first.title) }));

    expect(screen.getByRole('checkbox', { name: new RegExp(first.title) })).toBeChecked();
    expect(JSON.parse(localStorage.getItem('tripnote:completion:v1:osaka-kyoto-family-2026') ?? '{}').items).toEqual([
      first.id,
    ]);
  });

  it('opens on the section named in the address', () => {
    window.history.replaceState(null, '', '/t/osaka-kyoto-family-2026#preparation');
    render(<TripScreen trip={osaka} initialDay={0} />);
    expect(screen.getByRole('heading', { level: 2, name: '준비물' })).toBeInTheDocument();
  });

  it('keeps the legacy overview and airport guides under trip info, collapsed', () => {
    render(<TripScreen trip={osaka} initialDay={0} />);
    const info = screen.getByRole('region', { name: '여행 전체 안내' });

    const summaries = [...info.querySelectorAll(':scope > details > summary')].map((s) => s.textContent);
    expect(summaries).toEqual(['항공편과 이동 경로', '여행 개요', '공항 이용 안내']);
    expect(info.querySelectorAll(':scope > details[open]')).toHaveLength(0);
  });

  it('shows the day tour with its fees on the tour day', () => {
    const tourDay = osaka.days.findIndex((d) => d.tour);
    render(<TripScreen trip={osaka} initialDay={tourDay} />);

    expect(screen.getByRole('heading', { name: '바다의 교토 일일투어' })).toBeInTheDocument();
    expect(screen.getByText('입장료·승선료 확인')).toBeInTheDocument();
    expect(screen.getByText(/뷰랜드 왕복 리프트/)).toBeInTheDocument();
  });

  it('lists the day places with directions and opens a guide from the index', async () => {
    const { container } = render(<TripScreen trip={osaka} initialDay={0} />);
    const index = screen.getByRole('region', { name: '명소 가는 길' });
    const firstButton = within(index).getAllByRole('button')[0]!;
    const key = firstButton.getAttribute('data-stop-key')!;

    await userEvent.click(firstButton);

    expect(container.querySelector(`#guide-${key}`)).toHaveAttribute('open');
    expect(container.querySelector(`#stop-${key} details[data-stop-detail]`)).toHaveAttribute('open');
  });

  it('shows flights for a trip that has no legacy overview', () => {
    render(<TripScreen trip={readTrip(danangTrip())} initialDay={0} />);
    const info = screen.getByRole('region', { name: '여행 전체 안내' });
    expect(within(info).getByText('항공편과 이동 경로')).toBeInTheDocument();
  });
});
