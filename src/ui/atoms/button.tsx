import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  pressed?: boolean;
}

export function Button({ pressed, className, children, ...rest }: ButtonProps): ReactNode {
  return (
    <button
      type="button"
      className={`btn${pressed ? ' on' : ''}${className ? ' ' + className : ''}`}
      aria-pressed={pressed}
      {...rest}
    >
      {children}
    </button>
  );
}
