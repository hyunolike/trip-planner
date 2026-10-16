'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, TextField } from '@/components/ui';
import { api } from '@/lib/api/client';
import { problemMessage } from '@/lib/api/errors';
import { type SignupValues, signupSchema } from '@/lib/auth/schemas';
import styles from './Auth.module.css';

export function SignupForm() {
  const [sent, setSent] = useState<string>();
  const [serverError, setServerError] = useState<string>();
  const { register, handleSubmit, formState } = useForm<SignupValues>({ resolver: zodResolver(signupSchema) });

  async function onSubmit(values: SignupValues) {
    setServerError(undefined);
    try {
      const { data, error, response } = await api.POST('/api/v1/auth/signup', { body: values });
      if (data) setSent(data.message);
      else setServerError(problemMessage(error, response.status));
    } catch (e) {
      setServerError(problemMessage(e));
    }
  }

  if (sent) {
    return (
      <div className={styles.form}>
        <h1 className={styles.title}>메일을 확인해 주세요</h1>
        <p role="status" className={styles.done}>
          {sent}
        </p>
        <p className={styles.lead}>메일의 링크를 열고 가입할 때 정한 비밀번호를 한 번 더 입력하면 가입이 끝나요.</p>
      </div>
    );
  }

  return (
    <form method="post" className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      <h1 className={styles.title}>이메일로 가입</h1>
      <TextField
        label="닉네임"
        required
        autoComplete="nickname"
        error={formState.errors.nickname?.message}
        {...register('nickname')}
      />
      <TextField
        label="이메일"
        type="email"
        required
        autoComplete="email"
        error={formState.errors.email?.message}
        {...register('email')}
      />
      <TextField
        label="비밀번호"
        type="password"
        required
        autoComplete="new-password"
        help="10자 이상. 다른 사이트에서 쓰지 않는 비밀번호를 정해 주세요."
        error={formState.errors.password?.message}
        {...register('password')}
      />
      {serverError ? (
        <p role="alert" className={styles.error}>
          {serverError}
        </p>
      ) : null}
      <Button type="submit" variant="primary" size="lg" disabled={formState.isSubmitting}>
        가입하기
      </Button>
      <p className={styles.links}>
        <Link href="/login">이미 가입했다면 로그인하기</Link>
      </p>
    </form>
  );
}
