'use client';

import { type ReactNode, useEffect, useId, useRef } from 'react';
import { Button } from '@/components/ui';
import styles from './Edit.module.css';

export function FormSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    const previous = document.activeElement;
    if (node.showModal) node.showModal();
    else node.setAttribute('open', '');
    node.querySelector<HTMLElement>('input, button')?.focus();
    return () => {
      if (node.open && node.close) node.close();
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={styles.sheet}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
        if (event.key !== 'Tab') return;
        const nodes = [
          ...event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]',
          ),
        ];
        const first = nodes[0];
        const last = nodes.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
    >
      <header className={styles.sheetHeader}>
        <h2 id={titleId}>{title}</h2>
        <Button aria-label="편집 창 닫기" onClick={onClose}>
          닫기
        </Button>
      </header>
      {children}
    </dialog>
  );
}
