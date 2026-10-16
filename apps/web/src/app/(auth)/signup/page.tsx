import type { Metadata } from 'next';
import { SignupForm } from '@/components/auth/SignupForm';

export const metadata: Metadata = { title: '가입', robots: { index: false } };

export default function SignupPage() {
  return <SignupForm />;
}
