import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ResetRequestForm } from '@/components/auth/ResetForms';
import { VerifyEmailForm } from '@/components/auth/VerifyEmailForm';
import { EmptyState } from '@/components/ui';

export const metadata: Metadata = { title: '이메일 인증', robots: { index: false } };

type Props = { searchParams: Promise<{ token?: string }> };

async function WithToken({ searchParams }: Props) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <>
        <EmptyState
          illustration="empty-share"
          title="인증 링크가 올바르지 않아요"
          text="메일의 링크를 다시 열어 주세요. 링크가 만료됐다면 비밀번호 찾기로 메일을 다시 받을 수 있어요."
        />
        <ResetRequestForm />
      </>
    );
  }
  return <VerifyEmailForm token={token} />;
}

export default function VerifyEmailPage(props: Props) {
  return (
    <Suspense fallback={null}>
      <WithToken {...props} />
    </Suspense>
  );
}
