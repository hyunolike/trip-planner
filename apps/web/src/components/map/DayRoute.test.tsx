import { osakaTrip } from '@test/fixtures/trip';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { getDayMapPoints, getDayRouteSegments } from '@/lib/map/route';
import { readTrip } from '@/lib/trip/content';
import { DayRoute } from './DayRoute';

const seen = vi.hoisted(() => [] as unknown[]);
vi.mock('./LazyTripMap', () => ({
  LazyTripMap: (props: { selectedKey?: string; points: unknown }) => {
    seen.push(props.points);
    return <div data-testid="map" data-selected={props.selectedKey ?? ''} />;
  },
}));

const day = readTrip(osakaTrip()).days[0]!;

function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

describe('DayRoute', () => {
  it('lists every located stop in order and selects one', async () => {
    mockReducedMotion(false);
    const onSelect = vi.fn();
    render(<DayRoute day={day} onSelect={onSelect} />);
    const order = screen.getByRole('list', { name: '이날의 이동 순서' });
    const points = getDayMapPoints(day);

    expect(within(order).getAllByRole('button')).toHaveLength(points.length);
    await userEvent.click(within(order).getAllByRole('button')[1]!);
    expect(onSelect).toHaveBeenCalledWith(points[1]!.key);
  });

  it('links every segment to Google, using a place search for flights', () => {
    mockReducedMotion(false);
    render(<DayRoute day={day} onSelect={() => {}} />);
    const links = screen.getAllByRole('link', { name: /→/ });
    const segments = getDayRouteSegments(day);

    expect(links).toHaveLength(segments.length);
    const flightIndex = segments.findIndex((s) => s.mode === 'flight');
    expect(links[flightIndex]).toHaveAttribute('href', expect.stringContaining('/maps/search/'));
    expect(screen.getByText(/안내 동선이에요/)).toBeInTheDocument();
  });

  it('names the transit modes it draws', () => {
    mockReducedMotion(false);
    render(<DayRoute day={day} onSelect={() => {}} />);
    const legend = screen.getByRole('list', { name: '지도 선 범례' });
    expect(within(legend).getByText('항공')).toBeInTheDocument();
    expect(within(legend).getByText('도보')).toBeInTheDocument();
  });

  it('renders nothing for a day without coordinates', () => {
    mockReducedMotion(false);
    const { container } = render(
      <DayRoute
        day={{ ...day, stops: day.stops.map((s) => ({ ...s, coordinates: undefined })) }}
        onSelect={() => {}}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('hands the map the same points and segments while the day is unchanged', () => {
    mockReducedMotion(false);
    seen.length = 0;
    const { rerender } = render(<DayRoute day={day} onSelect={() => {}} />);
    rerender(<DayRoute day={day} selectedKey="x" selectionNonce={2} onSelect={() => {}} />);

    expect(seen.length).toBeGreaterThan(1);
    expect(new Set(seen).size).toBe(1);
  });
});
