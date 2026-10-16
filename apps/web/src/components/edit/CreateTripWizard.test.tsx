import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { CreateTripWizard } from './CreateTripWizard';

const { post, push, refresh } = vi.hoisted(() => ({ post: vi.fn(), push: vi.fn(), refresh: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ api: { POST: post } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));

beforeEach(() => {
  vi.clearAllMocks();
  post.mockResolvedValue({ data: { slug: 'seoul-trip', id: 'trip-id' }, response: { ok: true } });
});

it('creates a private trip through destination, dates and travelers then opens day one', async () => {
  const user = userEvent.setup();
  render(<CreateTripWizard />);
  await user.type(screen.getByLabelText('도시 이름'), '서울, 수원');
  await user.click(screen.getByRole('button', { name: '다음' }));
  fireEvent.change(screen.getByLabelText('시작 날짜'), { target: { value: '2026-11-01' } });
  fireEvent.change(screen.getByLabelText('종료 날짜'), { target: { value: '2026-11-03' } });
  await user.click(screen.getByRole('button', { name: '다음' }));
  await user.type(screen.getByLabelText('동행 이름 1'), '엄마');
  await user.type(screen.getByLabelText('동행 이모지 1'), '👩');
  await user.click(screen.getByRole('button', { name: '여행 만들기' }));
  await waitFor(() => expect(push).toHaveBeenCalledWith('/t/seoul-trip/edit?day=1'));
  expect(post).toHaveBeenCalledWith('/api/v1/trips', {
    body: expect.objectContaining({
      city: '서울, 수원',
      startDate: '2026-11-01',
      endDate: '2026-11-03',
      travelers: [{ label: '엄마', emoji: '👩' }],
    }),
  });
});

it('retains fields when creation fails and allows retry without re-entering the journey', async () => {
  const user = userEvent.setup();
  post.mockRejectedValueOnce(new TypeError('offline'));
  render(<CreateTripWizard />);
  await user.type(screen.getByLabelText('도시 이름'), '서울');
  await user.click(screen.getByRole('button', { name: '다음' }));
  fireEvent.change(screen.getByLabelText('시작 날짜'), { target: { value: '2026-11-01' } });
  fireEvent.change(screen.getByLabelText('종료 날짜'), { target: { value: '2026-11-02' } });
  await user.click(screen.getByRole('button', { name: '다음' }));
  await user.click(screen.getByRole('button', { name: '건너뛰고 만들기' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('연결');
  await user.click(screen.getByRole('button', { name: '이전' }));
  expect(screen.getByLabelText('시작 날짜')).toHaveValue('2026-11-01');
});
