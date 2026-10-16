import type { ReactNode } from 'react';
import styles from './Badge.module.css';
import { Icon, type IconName } from './Icon';

type Props = {
  tone?: 'neutral' | 'confirmed' | 'brand' | 'check' | 'danger';
  pill?: boolean;
  icon?: IconName;
  children: ReactNode;
};

export function Badge({ tone = 'neutral', pill = false, icon, children }: Props) {
  const classes = [styles.badge, tone !== 'neutral' ? styles[tone] : '', pill ? styles.pill : '']
    .filter(Boolean)
    .join(' ');
  return (
    <span className={classes}>
      {icon ? <Icon name={icon} size={16} /> : null}
      {children}
    </span>
  );
}
