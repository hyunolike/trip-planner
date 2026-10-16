import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/layout/SiteHeader';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="page page-narrow">
        {children}
      </main>
    </>
  );
}
