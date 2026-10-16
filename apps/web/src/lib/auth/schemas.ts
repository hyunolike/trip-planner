import { z } from 'zod';

const EMAIL = '이메일 주소를 확인해 주세요.';

const email = z.email(EMAIL).max(254, EMAIL);
const newPassword = z.string().min(10, '비밀번호는 10자 이상이어야 해요.').max(128, '비밀번호는 128자 이하여야 해요.');

export const loginSchema = z.object({ email, password: z.string().min(1, '비밀번호를 입력해 주세요.') });
export const signupSchema = z.object({
  nickname: z.string().trim().min(1, '닉네임을 입력해 주세요.').max(30, '닉네임은 30자까지 쓸 수 있어요.'),
  email,
  password: newPassword,
});
export const verifySchema = z.object({ password: z.string().min(1, '가입할 때 정한 비밀번호를 입력해 주세요.') });
export const emailSchema = z.object({ email });
export const resetSchema = z
  .object({ password: newPassword, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: '두 비밀번호가 같지 않아요.' });

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;
export type VerifyValues = z.infer<typeof verifySchema>;
export type EmailValues = z.infer<typeof emailSchema>;
export type ResetValues = z.infer<typeof resetSchema>;
