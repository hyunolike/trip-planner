import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ResetConfirmForm, ResetRequestForm } from '@/components/auth/ResetForms';

export const metadata: Metadata = { title: '비밀번호 재설정', robots: { index: false } };

type Props = { searchParams: Promise<{ token?: string }> };

async function WithToken({ searchParams }: Props) {
  const { token } = await searchParams;
  return token ? <ResetConfirmForm token={token} /> : <ResetRequestForm />;
}

export default function ResetPasswordPage(props: Props) {
  return (
    <Suspense fallback={<ResetRequestForm />}>
      <WithToken {...props} />
    </Suspense>
  );
}
