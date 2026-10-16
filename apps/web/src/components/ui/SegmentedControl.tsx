import styles from './SegmentedControl.module.css';

type Option<T extends string> = { value: T; label: string };
type Props<T extends string> = { label: string; options: Option<T>[]; value: T; onChange: (value: T) => void };

export function SegmentedControl<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: 버튼 묶음은 fieldset 대신 group 역할로 표시한다
    <div role="group" aria-label={label} className={styles.track}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={styles.option}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
