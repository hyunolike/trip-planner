import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { TripActions } from './TripActions';

const POST = vi.fn();
const GET = vi.fn();
const DELETE = vi.fn();
const router = { push: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/lib/api/client', () => ({
  api: {
    POST: (...x: unknown[]) => POST(...x),
    GET: (...x: unknown[]) => GET(...x),
    DELETE: (...x: unknown[]) => DELETE(...x),
  },
}));
const trip = { id: 't1', slug: 'test-trip', permissions: { canEdit: true, canClone: false } };
beforeEach(() => {
  vi.clearAllMocks();
  GET.mockResolvedValue({ data: [{ id: 'link1', createdAt: '2026-10-16T00:00:00Z' }], response: new Response() });
});
it('requires acknowledgement before creating a private trip share and supports revocation', async () => {
  POST.mockResolvedValue({ data: { id: 'link2', token: 'a'.repeat(43) }, response: new Response() });
  DELETE.mockResolvedValue({ response: new Response(null, { status: 204 }) });
  render(<TripActions trip={trip} />);
  await userEvent.click(screen.getByRole('button', { name: '공유하기' }));
  expect(screen.getByRole('button', { name: '보기 링크 만들기' })).toBeDisabled();
  await userEvent.click(screen.getByLabelText(/개인정보를 확인했어요/));
  await userEvent.click(screen.getByRole('button', { name: '보기 링크 만들기' }));
  expect(await screen.findByLabelText('보기 링크')).toHaveValue(`http://localhost:3000/s/${'a'.repeat(43)}`);
  await userEvent.click(screen.getByRole('button', { name: '링크 1 회수하기' }));
  expect(DELETE).toHaveBeenCalledWith('/api/v1/trips/{tripId}/share-links/{linkId}', {
    params: { path: { tripId: 't1', linkId: 'link1' } },
  });
});
it('clones through the share grant instead of the inaccessible private slug', async () => {
  POST.mockResolvedValue({ data: { id: 'copy', slug: 'my-copy' }, response: new Response(null, { status: 201 }) });
  render(
    <TripActions trip={{ ...trip, permissions: { canEdit: false, canClone: true } }} shareToken={'b'.repeat(43)} />,
  );
  await userEvent.click(screen.getByRole('button', { name: '내 여행으로 복제하기' }));
  expect(POST).toHaveBeenCalledWith('/api/v1/share/{token}/clone', { params: { path: { token: 'b'.repeat(43) } } });
  expect(router.push).toHaveBeenCalledWith('/t/my-copy/edit');
});
it('preserves the shared destination when anonymous cloning requires login', async () => {
  POST.mockResolvedValue({ response: new Response(null, { status: 401 }) });
  render(
    <TripActions trip={{ ...trip, permissions: { canEdit: false, canClone: false } }} shareToken={'b'.repeat(43)} />,
  );
  await userEvent.click(screen.getByRole('button', { name: '내 여행으로 복제하기' }));
  expect(router.push).toHaveBeenCalledWith(`/login?next=${encodeURIComponent(`/s/${'b'.repeat(43)}`)}`);
});
