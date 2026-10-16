import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { danangTrip } from '@test/fixtures/trip';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { readTrip } from '@/lib/trip/content';
import { TripScreen } from './TripScreen';

const GET = vi.fn();
vi.mock('@/lib/api/client', () => ({ api: { GET: (...args: unknown[]) => GET(...args) } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/components/map/LazyTripMap', () => ({ LazyTripMap: () => null }));

it('disables progress controls until identity is resolved so an early click cannot be silently lost', async () => {
  let resolveMe: ((value: unknown) => void) | undefined;
  const pending = new Promise((resolve) => {
    resolveMe = resolve;
  });
  GET.mockImplementation((path: string) =>
    path === '/api/v1/me' ? pending : Promise.resolve({ data: { status: 'out_of_range' }, response: new Response() }),
  );
  const trip = readTrip(danangTrip());
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <TripScreen trip={trip} initialDay={0} />
    </QueryClientProvider>,
  );
  const first = screen.getAllByRole('button', { name: /^일정 완료 표시:/ })[0];
  expect(first).toBeDisabled();
  await act(async () => resolveMe?.({ response: new Response(null, { status: 401 }) }));
  await waitFor(() => expect(first).toBeEnabled());
  await userEvent.click(first as HTMLElement);
  expect(first).toHaveAttribute('aria-pressed', 'true');
});
