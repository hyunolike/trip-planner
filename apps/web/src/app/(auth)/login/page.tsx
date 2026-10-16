import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = { title: '로그인', robots: { index: false } };

type Props = { searchParams: Promise<{ error?: string; next?: string }> };

async function WithParams({ searchParams }: Props) {
  const { error, next } = await searchParams;
  return <LoginForm googleError={error === 'google'} next={next} />;
}

export default function LoginPage(props: Props) {
  return (
    <Suspense fallback={null}>
      <WithParams {...props} />
    </Suspense>
  );
}
