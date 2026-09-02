import type { ReactNode } from 'react';

export interface LabelProps {
  text: string;
  kind?: 'title' | 'sub' | 'unit';
}

/** Faceplate silkscreen text. Always a text node — def labels can be user-authored. */
export function Label({ text, kind = 'title' }: LabelProps): ReactNode {
  return <span className={`panel-label ${kind}`}>{text}</span>;
}
