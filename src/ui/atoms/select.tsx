import { useId, type ReactNode } from 'react';

export interface SelectProps {
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  label: string;
}

export function Select({ value, options, onChange, label }: SelectProps): ReactNode {
  const id = useId();
  return (
    <div className="select">
      <label className="select-label" htmlFor={id}>
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
