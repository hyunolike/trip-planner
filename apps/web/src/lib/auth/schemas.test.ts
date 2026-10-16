import { describe, expect, it } from 'vitest';
import { loginSchema, resetSchema, signupSchema } from './schemas';

const issues = (result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  Object.fromEntries((result.error?.issues ?? []).map((i) => [String(i.path[0]), i.message]));

describe('auth schemas', () => {
  it('explains a wrong email and an empty password', () => {
    expect(issues(loginSchema.safeParse({ email: 'mina', password: '' }))).toEqual({
      email: '이메일 주소를 확인해 주세요.',
      password: '비밀번호를 입력해 주세요.',
    });
  });

  it('uses the api limits for signup', () => {
    expect(issues(signupSchema.safeParse({ nickname: ' ', email: 'mina@example.com', password: 'short' }))).toEqual({
      nickname: '닉네임을 입력해 주세요.',
      password: '비밀번호는 10자 이상이어야 해요.',
    });
    expect(
      issues(
        signupSchema.safeParse({ nickname: '가'.repeat(31), email: 'mina@example.com', password: 'x'.repeat(129) }),
      ),
    ).toEqual({
      nickname: '닉네임은 30자까지 쓸 수 있어요.',
      password: '비밀번호는 128자 이하여야 해요.',
    });
    expect(
      signupSchema.safeParse({ nickname: '미나', email: 'mina@example.com', password: 'trip-note-2027' }).success,
    ).toBe(true);
  });

  it('needs the new password twice', () => {
    expect(issues(resetSchema.safeParse({ password: 'trip-note-2027', confirm: 'trip-note-2028' }))).toEqual({
      confirm: '두 비밀번호가 같지 않아요.',
    });
  });
});
