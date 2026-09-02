import type { ReactNode } from 'react';

export interface ScrewProps {
  /** faceplate corner */
  at?: 'tl' | 'tr' | 'bl' | 'br';
}

export function Screw({ at = 'tl' }: ScrewProps): ReactNode {
  return <i className={`screw ${at}`} aria-hidden="true" />;
}
