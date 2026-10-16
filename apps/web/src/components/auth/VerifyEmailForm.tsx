'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, TextField } from '@/components/ui';
import { api } from '@/lib/api/client';
import { problemMessage } from '@/lib/api/errors';
import { type VerifyValues, verifySchema } from '@/lib/auth/schemas';
import styles from './Auth.module.css';

export function VerifyEmailForm({ token }: { token: string }) {
  const [done, setDone] = useState<string>();
  const [serverError, setServerError] = useState<string>();
  const { register, handleSubmit, formState } = useForm<VerifyValues>({ resolver: zodResolver(verifySchema) });

  async function onSubmit(values: VerifyValues) {
    setServerError(undefined);
    try {
      const { data, error, response } = await api.POST('/api/v1/auth/verify-email', {
        body: { token, password: values.password },
      });
      if (data) setDone(data.message);
      else setServerError(problemMessage(error, response.status));
    } catch (e) {
      setServerError(problemMessage(e));
    }
  }

  if (done) {
    return (
      <div className={styles.form}>
        <h1 className={styles.title}>가입이 끝났어요</h1>
        <p role="status" className={styles.done}>
          {done}
        </p>
        <Button href="/login" variant="primary" size="lg">
          로그인하기
        </Button>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      <h1 className={styles.title}>이메일 인증</h1>
      <p className={styles.lead}>본인 확인을 위해 가입할 때 정한 비밀번호를 한 번 더 입력해 주세요.</p>
      <TextField
        label="가입할 때 정한 비밀번호"
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
        가입 마치기
      </Button>
    </form>
  );
}
