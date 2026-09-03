import type { CSSProperties, ReactNode } from 'react';

const HEX = /^#[0-9a-fA-F]{3,8}$/;

export interface ModuleHeaderProps {
  name: string;
  sub: string;
  /** a CAT_COLOR hex; anything else falls back to the CUSTOM tint */
  color: string;
}

export function ModuleHeader({ name, sub, color }: ModuleHeaderProps): ReactNode {
  const style = { '--cat': HEX.test(color) ? color : 'var(--cat-custom)' } as CSSProperties;
  return (
    <header className="module-head" style={style}>
      <div className="module-name">{name}</div>
      <div className="module-sub">{sub}</div>
    </header>
  );
}
