'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, TextField } from '@/components/ui';
import { api } from '@/lib/api/client';
import { problemMessage } from '@/lib/api/errors';
import { type LoginValues, loginSchema } from '@/lib/auth/schemas';
import styles from './Auth.module.css';

export function LoginForm({ googleError }: { googleError: boolean }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string>();
  const { register, handleSubmit, formState } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginValues) {
    setServerError(undefined);
    try {
      const { response, error } = await api.POST('/api/v1/auth/login', { body: values });
      if (response.ok) {
        router.replace('/');
        router.refresh();
        return;
      }
      setServerError(problemMessage(error, response.status));
    } catch (e) {
      setServerError(problemMessage(e));
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      <h1 className={styles.title}>로그인</h1>
      {googleError ? (
        <p role="alert" className={styles.error}>
          구글 로그인을 마치지 못했어요. 다시 시도해 주세요.
        </p>
      ) : null}
      <a className={styles.google} href="/oauth2/authorization/google">
        구글로 계속하기
      </a>
      <p className={styles.divider}>또는 이메일로</p>
      <TextField
        label="이메일"
        type="email"
        autoComplete="email"
        error={formState.errors.email?.message}
        {...register('email')}
      />
      <TextField
        label="비밀번호"
        type="password"
        autoComplete="current-password"
        error={formState.errors.password?.message}
        {...register('password')}
      />
      {serverError ? (
        <p role="alert" className={styles.error}>
          {serverError}
        </p>
      ) : null}
      <Button type="submit" variant="primary" size="lg" disabled={formState.isSubmitting}>
        로그인하기
      </Button>
      <p className={styles.links}>
        <Link href="/signup">이메일로 가입하기</Link>
        <Link href="/reset-password">비밀번호 찾기</Link>
      </p>
    </form>
  );
}
