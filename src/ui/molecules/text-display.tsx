import { useReducer, type ReactNode } from 'react';
import type { ModuleInstance } from '../../engine/types';
import { useWorkletFeed } from '../../hooks/module-api';

interface TextMsg {
  t: string;
  v?: unknown;
}

/** LCD line. Natives write `m.ext.text` directly; worklets post `{t:'text', v}`. */
export function TextDisplay({ m }: { m: ModuleInstance }): ReactNode {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useWorkletFeed<TextMsg>(m, (msg) => {
    if (msg.t !== 'text' || typeof msg.v !== 'string') return;
    m.ext.text = msg.v;
    bump();
  });
  return <div className="text-screen">{typeof m.ext.text === 'string' ? m.ext.text : ''}</div>;
}
