'use client';

import type { ReactNode, SyntheticEvent } from 'react';
import styles from './Disclosure.module.css';
import { Icon } from './Icon';

type Props = {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onToggle?: (open: boolean) => void;
  className?: string;
  id?: string;
};

export function Disclosure({ summary, children, defaultOpen, open, onToggle, className, id }: Props) {
  return (
    <details
      id={id}
      className={[styles.disclosure, className].filter(Boolean).join(' ')}
      open={open ?? defaultOpen}
      onToggle={(event: SyntheticEvent<HTMLDetailsElement>) => onToggle?.(event.currentTarget.open)}
    >
      <summary>
        <span>{summary}</span>
        <Icon name="chevron-down" className={styles.chevron} />
      </summary>
      {children}
    </details>
  );
}
