import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';
import { Icon, type IconName } from './Icon';

type Common = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  children?: ReactNode;
  className?: string;
};
type AsLink = Common & { href: string; 'aria-label'?: string; prefetch?: boolean };
type AsButton = Common & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> & { href?: undefined };

export function Button(props: AsLink | AsButton) {
  const { variant = 'secondary', size = 'md', icon, children, className } = props;
  const classes = [
    styles.button,
    styles[variant],
    size !== 'md' ? styles[size] : '',
    icon && !children ? styles.iconOnly : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  const content = (
    <>
      {icon ? <Icon name={icon} /> : null}
      {children}
    </>
  );
  if (props.href !== undefined) {
    return (
      <Link href={props.href} className={classes} aria-label={props['aria-label']} prefetch={props.prefetch}>
        {content}
      </Link>
    );
  }
  const { variant: _v, size: _s, icon: _i, children: _c, className: _cn, href: _h, type = 'button', ...rest } = props;
  return (
    <button type={type} className={classes} {...rest}>
      {content}
    </button>
  );
}
