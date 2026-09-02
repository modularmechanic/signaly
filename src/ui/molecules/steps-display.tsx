import { useState, type ReactNode } from 'react';
import type { ModuleInstance } from '../../engine/types';
import { useWorkletFeed } from '../../hooks/module-api';
import { Led } from '../atoms/led';

interface StepMsg {
  t: string;
  i?: number;
  n?: number;
  pattern?: ArrayLike<number>;
}

const MAX = 16;

/** Playhead + pattern LEDs, fed by euklid's `{t:'step', i, n, pattern}`. */
export function StepsDisplay({ m }: { m: ModuleInstance }): ReactNode {
  const [step, setStep] = useState({ i: -1, n: MAX, pat: [] as number[] });
  useWorkletFeed<StepMsg>(m, (msg) => {
    if (msg.t !== 'step') return;
    setStep({
      i: msg.i ?? -1,
      n: Math.max(1, Math.min(MAX, msg.n ?? MAX)),
      pat: msg.pattern ? Array.from(msg.pattern) : [],
    });
  });
  return (
    <div className="steps-display">
      {Array.from({ length: step.n }, (_, k) => (
        <Led key={k} on={k === step.i ? 1 : (step.pat[k] ?? 0) * 0.45} />
      ))}
    </div>
  );
}
