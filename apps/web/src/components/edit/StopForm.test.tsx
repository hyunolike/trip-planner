import { osakaTrip } from '@test/fixtures/trip';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { FormSheet } from './FormSheet';
import { StopForm } from './StopForm';
import { toStopDraft } from './stop-draft';

afterEach(() => vi.useRealTimers());

vi.mock('@/components/map/LazyTripMap', () => ({
  LazyTripMap: ({ onPick }: { onPick: (point: [number, number]) => void }) => (
    <button type="button" onClick={() => onPick([37.5, 127])}>
      지도에 핀 찍기
    </button>
  ),
}));

it('lets a map pin fill both coordinate fields while preserving keyboard entry', async () => {
  render(<StopForm draftKey="map-draft" onSave={vi.fn()} onDone={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: '지도에서 위치 선택하기' }));
  fireEvent.click(screen.getByRole('button', { name: '지도에 핀 찍기' }));
  expect(screen.getByLabelText('위도')).toHaveValue(37.5);
  expect(screen.getByLabelText('경도')).toHaveValue(127);
});

it('auto-saves an edited stop after 800ms and preserves draft on failure', async () => {
  vi.useFakeTimers();
  const save = vi.fn().mockRejectedValue(new Error('다른 곳에서 바뀌었어요. 입력을 유지했어요.'));
  const stop = osakaTrip().days[0]!.stops[0]!;
  render(<StopForm stop={stop} draftKey="draft-test" onSave={save} onDone={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('제목'), { target: { value: '수정한 제목' } });
  await act(() => vi.advanceTimersByTimeAsync(799));
  expect(save).not.toHaveBeenCalled();
  await act(() => vi.advanceTimersByTimeAsync(1));
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ title: '수정한 제목' }));
  expect(screen.getByRole('alert')).toHaveTextContent('입력을 유지');
  expect(screen.getByLabelText('제목')).toHaveValue('수정한 제목');
  expect(JSON.parse(localStorage.getItem('draft-test') ?? '{}').draft.title).toBe('수정한 제목');
});

it('preserves a stale restored draft but blocks saving it against a newer server version', async () => {
  const stop = osakaTrip().days[0]!.stops[0]!;
  localStorage.setItem(
    'stale-draft',
    JSON.stringify({
      version: 1,
      baseVersion: stop.version,
      draft: { ...toStopDraft(stop), title: '아직 저장하지 못한 제목' },
    }),
  );
  const save = vi.fn().mockResolvedValue(undefined);
  render(
    <StopForm
      stop={{ ...stop, version: stop.version + 1, details: '서버의 새 메모' }}
      draftKey="stale-draft"
      onSave={save}
      onDone={vi.fn()}
    />,
  );
  expect(screen.getByLabelText('제목')).toHaveValue('아직 저장하지 못한 제목');
  fireEvent.click(screen.getByRole('button', { name: '저장하고 닫기' }));
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByText(/서버에서 일정이 바뀌었어요/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '서버 내용으로 바꾸기' }));
  expect(screen.getByLabelText('메모')).toHaveValue('서버의 새 메모');
  expect(localStorage.getItem('stale-draft')).toBeNull();
});

it('treats an existing flat draft as unversioned and requires explicit recovery', () => {
  const stop = osakaTrip().days[0]!.stops[0]!;
  localStorage.setItem('flat-draft', JSON.stringify({ ...toStopDraft(stop), title: '이전 초안' }));
  render(<StopForm stop={stop} draftKey="flat-draft" onSave={vi.fn()} onDone={vi.fn()} />);
  expect(screen.getByLabelText('제목')).toHaveValue('이전 초안');
  expect(screen.getByRole('button', { name: '저장하고 닫기' })).toBeDisabled();
});

it('removes an acknowledged autosave draft so a later visit uses the current server fields', async () => {
  vi.useFakeTimers();
  const stop = osakaTrip().days[0]!.stops[0]!;
  render(
    <StopForm stop={stop} draftKey="saved-draft" onSave={vi.fn().mockResolvedValue(undefined)} onDone={vi.fn()} />,
  );
  fireEvent.change(screen.getByLabelText('제목'), { target: { value: '저장할 제목' } });
  await act(() => vi.advanceTimersByTimeAsync(800));
  expect(localStorage.getItem('saved-draft')).toBeNull();
});

it('closes the accessible dialog with Escape and restores the trigger focus', () => {
  const close = vi.fn();
  const trigger = document.createElement('button');
  document.body.append(trigger);
  trigger.focus();
  const { unmount } = render(
    <FormSheet title="일정 편집" onClose={close}>
      <input aria-label="테스트 입력" />
    </FormSheet>,
  );
  const dialog = screen.getByRole('dialog', { name: '일정 편집' });
  fireEvent.keyDown(dialog, { key: 'Escape' });
  expect(close).toHaveBeenCalledOnce();
  unmount();
  expect(trigger).toHaveFocus();
  trigger.remove();
});
