import { osakaTrip } from '@test/fixtures/trip';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { TripEditor } from './TripEditor';

const { get, post, patch, put, remove } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('@/lib/api/client', () => ({ api: { GET: get, POST: post, PATCH: patch, PUT: put, DELETE: remove } }));
vi.mock('@/components/map/DayRoute', () => ({ DayRoute: () => <div>일정 지도</div> }));

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/t/test/edit');
});

it('reorders by accessible buttons and sends the full stop order through the queue', async () => {
  const trip = osakaTrip();
  trip.isSample = false;
  trip.permissions.canEdit = true;
  get.mockImplementation(async (path: string) => ({
    data: path === '/api/v1/me' ? { id: 'user-1' } : trip,
    response: { status: 200 },
  }));
  put.mockResolvedValue({ data: [], response: { status: 200 } });
  render(<TripEditor initialTrip={trip} userId="user-1" />);
  const first = trip.days[0]!.stops[0]!;
  await userEvent.click(screen.getByRole('button', { name: `아래로 이동: ${first.title}` }));
  await waitFor(() =>
    expect(put).toHaveBeenCalledWith(
      '/api/v1/days/{dayId}/stops/order',
      expect.objectContaining({
        body: {
          stopIds: [trip.days[0]!.stops[1]!.id, first.id, ...trip.days[0]!.stops.slice(2).map((stop) => stop.id)],
        },
      }),
    ),
  );
});

it('requires confirmation before deletion and retains stop fields on a version conflict', async () => {
  const trip = osakaTrip();
  trip.isSample = false;
  trip.permissions.canEdit = true;
  get.mockImplementation(async (path: string) => ({
    data: path === '/api/v1/me' ? { id: 'user-1' } : trip,
    response: { status: 200 },
  }));
  patch.mockResolvedValue({ response: { status: 409 } });
  render(<TripEditor initialTrip={trip} userId="user-1" />);
  const first = trip.days[0]!.stops[0]!;
  await userEvent.click(screen.getByRole('button', { name: `삭제: ${first.title}` }));
  expect(remove).not.toHaveBeenCalled();
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '취소' }));
  await userEvent.click(screen.getByRole('button', { name: `수정: ${first.title}` }));
  fireEvent.change(screen.getByLabelText('제목'), { target: { value: '보존할 제목' } });
  await userEvent.click(screen.getByRole('button', { name: '저장하고 닫기' }));
  await waitFor(() => expect(patch).toHaveBeenCalled());
  expect(screen.getByLabelText('제목')).toHaveValue('보존할 제목');
  expect(screen.getAllByText(/다른 변경사항/).length).toBeGreaterThan(0);
});

it('does not expose editing controls for read-only samples', () => {
  const trip = osakaTrip();
  render(<TripEditor initialTrip={trip} userId="user-1" />);
  expect(screen.queryByRole('button', { name: '＋ 일정 추가' })).not.toBeInTheDocument();
});
