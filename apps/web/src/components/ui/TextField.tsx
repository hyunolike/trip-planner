import { type InputHTMLAttributes, useId } from 'react';
import styles from './TextField.module.css';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & {
  label: string;
  error?: string;
  help?: string;
  ref?: React.Ref<HTMLInputElement>;
};

export function TextField({ label, error, help, required, id, ref, ...input }: Props) {
  const generated = useId();
  const inputId = id ?? generated;
  const describedBy = error ? `${inputId}-error` : help ? `${inputId}-help` : undefined;
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
        {required ? (
          <b className={styles.required} aria-hidden="true">
            {' '}
            *
          </b>
        ) : null}
      </label>
      <input
        ref={ref}
        id={inputId}
        className={styles.input}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...input}
      />
      {error ? (
        <p id={`${inputId}-error`} className={styles.error}>
          {error}
        </p>
      ) : help ? (
        <p id={`${inputId}-help`} className={styles.help}>
          {help}
        </p>
      ) : null}
    </div>
  );
}
