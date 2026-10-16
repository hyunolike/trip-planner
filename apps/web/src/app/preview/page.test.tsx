import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import Preview from './page';

it('clearly labels the disconnected preview and offers no working authentication or trip actions', () => {
  render(<Preview />);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('예약은 어디서든, 일정은 여기서.');
  expect(screen.getByText('백엔드 연결 준비 중')).toBeVisible();
  for (const name of ['로그인 준비 중', '샘플 일정 준비 중', '여행 만들기 준비 중']) {
    expect(screen.getByRole('button', { name })).toBeDisabled();
  }
  expect(screen.queryByRole('link', { name: /로그인|샘플|여행 만들기/ })).toBeNull();
});
