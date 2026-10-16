'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, TextField } from '@/components/ui';
import { api } from '@/lib/api/client';
import { problemMessage } from '@/lib/api/errors';
import { type EmailValues, emailSchema, type ResetValues, resetSchema } from '@/lib/auth/schemas';
import styles from './Auth.module.css';

export function ResetRequestForm() {
  const [sent, setSent] = useState<string>();
  const [serverError, setServerError] = useState<string>();
  const { register, handleSubmit, formState } = useForm<EmailValues>({ resolver: zodResolver(emailSchema) });

  async function onSubmit(values: EmailValues) {
    setServerError(undefined);
    try {
      const { data, error, response } = await api.POST('/api/v1/auth/password-reset', { body: values });
      if (data) setSent(data.message);
      else setServerError(problemMessage(error, response.status));
    } catch (e) {
      setServerError(problemMessage(e));
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      <h1 className={styles.title}>비밀번호 찾기</h1>
      <p className={styles.lead}>가입한 이메일로 재설정 링크를 보내 드려요. 링크는 30분 동안 한 번만 쓸 수 있어요.</p>
      <TextField
        label="이메일"
        type="email"
        autoComplete="email"
        error={formState.errors.email?.message}
        {...register('email')}
      />
      {sent ? (
        <p role="status" className={styles.done}>
          {sent}
        </p>
      ) : null}
      {serverError ? (
        <p role="alert" className={styles.error}>
          {serverError}
        </p>
      ) : null}
      <Button type="submit" variant="primary" size="lg" disabled={formState.isSubmitting}>
        재설정 메일 받기
      </Button>
    </form>
  );
}

export function ResetConfirmForm({ token }: { token: string }) {
  const [done, setDone] = useState<string>();
  const [serverError, setServerError] = useState<string>();
  const { register, handleSubmit, formState } = useForm<ResetValues>({ resolver: zodResolver(resetSchema) });

  async function onSubmit(values: ResetValues) {
    setServerError(undefined);
    try {
      const { data, error, response } = await api.POST('/api/v1/auth/password-reset/confirm', {
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
        <h1 className={styles.title}>비밀번호를 바꿨어요</h1>
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
      <h1 className={styles.title}>새 비밀번호 정하기</h1>
      <TextField
        label="새 비밀번호"
        type="password"
        autoComplete="new-password"
        error={formState.errors.password?.message}
        {...register('password')}
      />
      <TextField
        label="새 비밀번호 확인"
        type="password"
        autoComplete="new-password"
        error={formState.errors.confirm?.message}
        {...register('confirm')}
      />
      {serverError ? (
        <p role="alert" className={styles.error}>
          {serverError}
        </p>
      ) : null}
      <Button type="submit" variant="primary" size="lg" disabled={formState.isSubmitting}>
        비밀번호 바꾸기
      </Button>
    </form>
  );
}
