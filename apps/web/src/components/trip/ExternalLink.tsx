import type { ReactNode } from 'react';

type Props = { href: string; children: ReactNode; className?: string };

export function ExternalLink({ href, children, className }: Props) {
  if (!/^https?:\/\//i.test(href)) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="visually-hidden"> (새 창)</span>
    </a>
  );
}
