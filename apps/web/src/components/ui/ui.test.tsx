import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Badge, Button, Disclosure, EmptyState, Icon, SegmentedControl, TextField } from '.';

describe('Icon', () => {
  it('is hidden from assistive tech unless it carries a label', () => {
    const { container } = render(<Icon name="map-pin" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');

    render(<Icon name="weather-rain" label="비" />);
    expect(screen.getByRole('img', { name: '비' })).toBeInTheDocument();
  });
});

describe('Button', () => {
  it('renders a link when given href and a button otherwise', () => {
    render(
      <>
        <Button href="/login">로그인하기</Button>
        <Button variant="secondary">새로 조회</Button>
      </>,
    );
    expect(screen.getByRole('link', { name: '로그인하기' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('button', { name: '새로 조회' })).toHaveAttribute('type', 'button');
  });

  it('does not fire when disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        저장하기
      </Button>,
    );
    await userEvent.click(screen.getByRole('button', { name: '저장하기' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('SegmentedControl', () => {
  it('marks the current option pressed and reports a new choice', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="일정 보기 방식"
        value="summary"
        onChange={onChange}
        options={[
          { value: 'summary', label: '간략 일정' },
          { value: 'detail', label: '상세 일정' },
        ]}
      />,
    );
    expect(screen.getByRole('group', { name: '일정 보기 방식' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '간략 일정' })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: '상세 일정' }));
    expect(onChange).toHaveBeenCalledWith('detail');
  });
});

describe('TextField', () => {
  it('connects the error to the input', () => {
    render(<TextField label="이메일" name="email" error="이메일 주소를 확인해 주세요." />);
    const input = screen.getByLabelText('이메일');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('이메일 주소를 확인해 주세요.');
  });

  it('marks required fields in the label', () => {
    render(<TextField label="비밀번호" name="password" type="password" required />);
    expect(screen.getByLabelText(/비밀번호/)).toBeRequired();
  });
});

describe('EmptyState', () => {
  it('shows a decorative illustration, a heading and one action', () => {
    const { container } = render(
      <EmptyState
        illustration="empty-itinerary"
        title="아직 일정이 없어요"
        text="샘플 일정을 둘러보세요."
        action={<Button href="/">홈으로 가기</Button>}
      />,
    );
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
    expect(container.querySelector('img')).toHaveAttribute('src', '/ds/illustrations/empty-itinerary.svg');
    expect(screen.getByRole('heading', { name: '아직 일정이 없어요' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '홈으로 가기' })).toBeInTheDocument();
  });
});

describe('Badge and Disclosure', () => {
  it('renders the label and toggles content', async () => {
    render(
      <>
        <Badge tone="check">방문 전 확인</Badge>
        <Disclosure summary="상세 안내">
          <p>가족 QR을 미리 준비하세요.</p>
        </Disclosure>
      </>,
    );
    expect(screen.getByText('방문 전 확인')).toBeInTheDocument();
    expect(screen.getByText('가족 QR을 미리 준비하세요.')).not.toBeVisible();
    await userEvent.click(screen.getByText('상세 안내'));
    expect(screen.getByText('가족 QR을 미리 준비하세요.')).toBeVisible();
  });
});
