import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { osakaTrip } from '@test/fixtures/trip';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readTrip } from '@/lib/trip/content';
import { WeatherCard } from './WeatherCard';

const GET = vi.fn();
vi.mock('@/lib/api/client', () => ({ api: { GET: (...args: unknown[]) => GET(...args) } }));

const day = readTrip(osakaTrip()).days[0]!;

function renderCard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <WeatherCard day={day} timezone="Asia/Tokyo" />
    </QueryClientProvider>,
  );
}

const ok = (data: object) => ({ data, error: undefined, response: new Response(null, { status: 200 }) });

describe('WeatherCard', () => {
  beforeEach(() => {
    GET.mockReset();
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-16T03:00:00Z') });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('asks the api for the day point in the trip time zone', async () => {
    GET.mockResolvedValue(ok({ date: day.date, status: 'out_of_range' }));
    renderCard();
    await screen.findByText(/아직 이 날짜의 예보가 없어요/);

    const [path, options] = GET.mock.calls[0]!;
    expect(path).toBe('/api/v1/weather');
    expect(options.params.query).toMatchObject({ date: day.date, timezone: 'Asia/Tokyo' });
  });

  it('shows the forecast with tips and the source', async () => {
    GET.mockResolvedValue(
      ok({
        date: day.date,
        status: 'ready',
        condition: 63,
        high: 22.4,
        low: 15.1,
        rainChance: 70,
        windSpeed: 4.25,
        checkedAt: '2026-10-16T00:00:00Z',
      }),
    );
    renderCard();

    expect(await screen.findByText('비')).toBeInTheDocument();
    expect(screen.getByText('22° / 15°')).toBeInTheDocument();
    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(screen.getByText('4.3 m/s')).toBeInTheDocument();
    expect(screen.getByText(/우산이나 우비를 챙겨요/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open-Meteo/ })).toHaveAttribute('href', 'https://open-meteo.com/');
    expect(screen.getByText(/10\.16 09:00 조회/)).toBeInTheDocument();
  });

  it('explains past dates', async () => {
    vi.setSystemTime(new Date('2026-12-01T00:00:00Z'));
    GET.mockResolvedValue(ok({ date: day.date, status: 'out_of_range' }));
    renderCard();
    expect(await screen.findByText('지난 여행 날짜의 예보는 보여 드리지 않아요.')).toBeInTheDocument();
  });

  it('offers a retry when the forecast is unavailable', async () => {
    vi.useRealTimers();
    GET.mockResolvedValueOnce(ok({ date: day.date, status: 'unavailable' })).mockResolvedValueOnce(
      ok({
        date: day.date,
        status: 'ready',
        condition: 0,
        high: 20,
        low: 18,
        rainChance: 0,
        windSpeed: 1,
        checkedAt: '2026-10-16T00:00:00Z',
      }),
    );
    renderCard();

    await userEvent.click(await screen.findByRole('button', { name: '새로 조회' }));

    expect(await screen.findByText('맑음')).toBeInTheDocument();
    expect(GET).toHaveBeenCalledTimes(2);
  });

  it('treats a failed request like an unavailable forecast', async () => {
    GET.mockRejectedValue(new TypeError('fetch failed'));
    renderCard();
    expect(await screen.findByText('날씨를 가져오지 못했어요. 잠시 후 다시 확인해 주세요.')).toBeInTheDocument();
  });
});
