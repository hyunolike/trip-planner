import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { TripSummary } from '@/lib/trip/content';
import { MyTrips, SampleList } from './HomeSections';
import { TripCard } from './TripCard';

const danang: TripSummary = {
  slug: 'danang-hoian-family-2027',
  title: '다낭·호이안 가족여행',
  subtitle: '엄마·아빠·초등학생 아이가 함께 떠나는 3박 5일 자유여행',
  startDate: '2027-03-03',
  endDate: '2027-03-07',
  isSample: true,
  visibility: 'public',
  cities: ['DA NANG', 'HOI AN → DA NANG'],
  stopCount: 57,
  coverPhoto: { src: 'https://upload.wikimedia.org/a.jpg', alt: '호이안 올드타운 등불', credit: 'Mig Gilbert' },
};

describe('TripCard', () => {
  it('links to the itinerary with its cover, dates and size', () => {
    render(<TripCard trip={danang} />);
    const link = screen.getByRole('link', { name: /다낭·호이안 가족여행/ });

    expect(link).toHaveAttribute('href', '/t/danang-hoian-family-2027');
    expect(within(link).getByRole('img', { name: '호이안 올드타운 등불' })).toBeInTheDocument();
    expect(within(link).getByText('2027.03.03 – 03.07 · 5일')).toBeInTheDocument();
    expect(within(link).getByText(danang.subtitle!)).toBeInTheDocument();
    expect(within(link).getByText('스톱 57개')).toBeInTheDocument();
    expect(within(link).getByText('샘플')).toBeInTheDocument();
  });

  it('falls back to the route illustration without a cover', () => {
    const { container } = render(<TripCard trip={{ ...danang, coverPhoto: undefined, subtitle: undefined }} />);
    expect(container.querySelector('img')).toHaveAttribute('src', '/ds/illustrations/hero-route.svg');
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
    expect(screen.getByText('DA NANG · HOI AN → DA NANG')).toBeInTheDocument();
  });
});

describe('SampleList', () => {
  it('shows cards, an empty message or a failure message', () => {
    const { rerender } = render(<SampleList samples={[danang]} />);
    expect(screen.getAllByRole('link', { name: /다낭/ })).toHaveLength(1);

    rerender(<SampleList samples={[]} />);
    expect(screen.getByText('지금은 공개된 샘플 일정이 없어요.')).toBeInTheDocument();

    rerender(<SampleList samples={null} />);
    expect(screen.getByText('샘플 일정을 불러오지 못했어요. 잠시 후 새로고침해 주세요.')).toBeInTheDocument();
  });
});

describe('MyTrips', () => {
  it('invites a visitor to sign in', () => {
    render(<MyTrips account={null} />);
    expect(screen.getByRole('link', { name: '로그인하기' })).toHaveAttribute('href', '/login');
  });

  it('greets a member and lists their trips or an empty state', () => {
    const me = { id: 'u1', email: 'mina@example.com', nickname: '미나' };
    const { rerender } = render(<MyTrips account={{ me, trips: [{ ...danang, isSample: false }] }} />);
    expect(screen.getByRole('heading', { name: '미나님의 여행' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /다낭/ })).toHaveLength(1);

    rerender(<MyTrips account={{ me, trips: [] }} />);
    expect(screen.getByText('아직 만든 여행이 없어요')).toBeInTheDocument();
  });
});
