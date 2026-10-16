import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteAccount, LogoutButton } from './AccountActions';
import { LoginForm } from './LoginForm';
import { ResetConfirmForm, ResetRequestForm } from './ResetForms';
import { SignupForm } from './SignupForm';
import { ResendVerificationForm, VerifyEmailForm } from './VerifyEmailForm';

const router = { replace: vi.fn(), refresh: vi.fn(), push: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const POST = vi.fn();
const DELETE = vi.fn();
vi.mock('@/lib/api/client', () => ({
  api: { POST: (...args: unknown[]) => POST(...args), DELETE: (...args: unknown[]) => DELETE(...args) },
}));

const reply = (status: number, body?: object) => ({
  data: status < 300 ? body : undefined,
  error: status >= 300 ? body : undefined,
  response: new Response(null, { status: status === 204 ? 204 : status }),
});

beforeEach(() => {
  POST.mockReset();
  DELETE.mockReset();
  for (const fn of Object.values(router)) fn.mockReset();
});

describe('LoginForm', () => {
  it('validates before calling the api', async () => {
    render(<LoginForm googleError={false} />);
    await userEvent.click(screen.getByRole('button', { name: '로그인하기' }));

    expect(await screen.findByText('이메일 주소를 확인해 주세요.')).toBeInTheDocument();
    expect(POST).not.toHaveBeenCalled();
  });

  it('signs in and goes home', async () => {
    POST.mockResolvedValue(reply(200, { id: 'u1', email: 'mina@example.com', nickname: '미나' }));
    render(<LoginForm googleError={false} />);

    await userEvent.type(screen.getByLabelText('이메일'), 'mina@example.com');
    await userEvent.type(screen.getByLabelText('비밀번호'), 'trip-note-2027');
    await userEvent.click(screen.getByRole('button', { name: '로그인하기' }));

    expect(POST).toHaveBeenCalledWith('/api/v1/auth/login', {
      body: { email: 'mina@example.com', password: 'trip-note-2027' },
    });
    expect(router.replace).toHaveBeenCalledWith('/');
    expect(router.refresh).toHaveBeenCalled();
  });

  it('shows the server reason when sign-in fails', async () => {
    POST.mockResolvedValue(reply(401, { detail: '이메일 또는 비밀번호가 맞지 않아요.' }));
    render(<LoginForm googleError={false} />);

    await userEvent.type(screen.getByLabelText('이메일'), 'mina@example.com');
    await userEvent.type(screen.getByLabelText('비밀번호'), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: '로그인하기' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('이메일 또는 비밀번호가 맞지 않아요.');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('offers google as a full page link and explains a failed google sign-in', () => {
    render(<LoginForm googleError />);
    expect(screen.getByRole('link', { name: '구글로 계속하기' })).toHaveAttribute(
      'href',
      '/oauth2/authorization/google',
    );
    expect(screen.getByRole('alert')).toHaveTextContent('구글 로그인을 마치지 못했어요. 다시 시도해 주세요.');
  });
});

describe('SignupForm', () => {
  it('shows the neutral server message after sending', async () => {
    POST.mockResolvedValue(reply(202, { message: '가입된 이메일이면 확인 메일을 보냈어요.' }));
    render(<SignupForm />);

    await userEvent.type(screen.getByLabelText(/닉네임/), '미나');
    await userEvent.type(screen.getByLabelText(/이메일/), 'mina@example.com');
    await userEvent.type(screen.getByLabelText(/비밀번호/), 'trip-note-2027');
    await userEvent.click(screen.getByRole('button', { name: '가입하기' }));

    expect(await screen.findByRole('status')).toHaveTextContent('가입된 이메일이면 확인 메일을 보냈어요.');
    expect(screen.queryByRole('button', { name: '가입하기' })).not.toBeInTheDocument();
  });
});

describe('VerifyEmailForm', () => {
  it('sends the token with the password chosen at signup', async () => {
    POST.mockResolvedValue(reply(200, { message: '가입이 끝났어요.' }));
    render(<VerifyEmailForm token="tok-123" />);

    await userEvent.type(screen.getByLabelText('가입할 때 정한 비밀번호'), 'trip-note-2027');
    await userEvent.click(screen.getByRole('button', { name: '가입 마치기' }));

    expect(POST).toHaveBeenCalledWith('/api/v1/auth/verify-email', {
      body: { token: 'tok-123', password: 'trip-note-2027' },
    });
    expect(await screen.findByRole('link', { name: '로그인하기' })).toHaveAttribute('href', '/login');
  });

  it('shows why a link no longer works', async () => {
    POST.mockResolvedValue(reply(400, { detail: '인증 링크가 만료됐어요. 메일을 다시 받아 주세요.' }));
    render(<VerifyEmailForm token="old" />);

    await userEvent.type(screen.getByLabelText('가입할 때 정한 비밀번호'), 'trip-note-2027');
    await userEvent.click(screen.getByRole('button', { name: '가입 마치기' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('인증 링크가 만료됐어요.');
  });
});

describe('ResetForms', () => {
  it('requests a reset link', async () => {
    POST.mockResolvedValue(reply(202, { message: '가입된 이메일이면 재설정 메일을 보냈어요.' }));
    render(<ResetRequestForm />);

    await userEvent.type(screen.getByLabelText('이메일'), 'mina@example.com');
    await userEvent.click(screen.getByRole('button', { name: '재설정 메일 받기' }));

    expect(POST).toHaveBeenCalledWith('/api/v1/auth/password-reset', { body: { email: 'mina@example.com' } });
    expect(await screen.findByRole('status')).toHaveTextContent('재설정 메일을 보냈어요');
  });

  it('checks the two new passwords match before sending', async () => {
    render(<ResetConfirmForm token="tok" />);

    await userEvent.type(screen.getByLabelText('새 비밀번호'), 'trip-note-2027');
    await userEvent.type(screen.getByLabelText('새 비밀번호 확인'), 'trip-note-2028');
    await userEvent.click(screen.getByRole('button', { name: '비밀번호 바꾸기' }));

    expect(await screen.findByText('두 비밀번호가 같지 않아요.')).toBeInTheDocument();
    expect(POST).not.toHaveBeenCalled();
  });
});

describe('AccountActions', () => {
  it('logs out and refreshes', async () => {
    POST.mockResolvedValue(reply(204));
    render(<LogoutButton />);

    await userEvent.click(screen.getByRole('button', { name: '로그아웃' }));

    expect(POST).toHaveBeenCalledWith('/api/v1/auth/logout');
    expect(router.replace).toHaveBeenCalledWith('/');
    expect(router.refresh).toHaveBeenCalled();
  });

  it('deletes the account only after typing the confirmation word', async () => {
    DELETE.mockResolvedValue(reply(204));
    render(<DeleteAccount />);

    await userEvent.click(screen.getByRole('button', { name: '탈퇴하기' }));
    const confirm = screen.getByRole('button', { name: '계정과 여행 모두 지우기' });
    expect(confirm).toBeDisabled();

    await userEvent.type(screen.getByLabelText('확인을 위해 탈퇴를 입력해 주세요'), '탈퇴');
    await userEvent.click(confirm);

    expect(DELETE).toHaveBeenCalledWith('/api/v1/me');
    expect(router.replace).toHaveBeenCalledWith('/');
  });
});

describe('ResendVerificationForm', () => {
  it('asks for a new verification mail and shows the neutral message', async () => {
    POST.mockResolvedValue(reply(202, { message: '가입된 이메일이면 인증 메일을 보냈어요.' }));
    render(<ResendVerificationForm />);

    await userEvent.type(screen.getByLabelText('이메일'), 'mina@example.com');
    await userEvent.click(screen.getByRole('button', { name: '인증 메일 다시 받기' }));

    expect(POST).toHaveBeenCalledWith('/api/v1/auth/verify-email/resend', { body: { email: 'mina@example.com' } });
    expect(await screen.findByRole('status')).toHaveTextContent('인증 메일을 보냈어요');
  });

  it('blocks a bad email without calling the api', async () => {
    render(<ResendVerificationForm />);

    await userEvent.type(screen.getByLabelText('이메일'), 'mina');
    await userEvent.click(screen.getByRole('button', { name: '인증 메일 다시 받기' }));

    expect(await screen.findByText('이메일 주소를 확인해 주세요.')).toBeInTheDocument();
    expect(POST).not.toHaveBeenCalled();
  });
});

describe('forms posted before hydration', () => {
  it('never put credentials in the query string', () => {
    const { container: login } = render(<LoginForm googleError={false} />);
    expect(login.querySelector('form')).toHaveAttribute('method', 'post');
    const { container: signup } = render(<SignupForm />);
    expect(signup.querySelector('form')).toHaveAttribute('method', 'post');
  });
});
