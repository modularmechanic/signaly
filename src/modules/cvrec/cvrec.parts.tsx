import { useState, type ReactNode } from 'react';
import type { ModuleInstance } from '../../engine/types';
import { useWorkletFeed } from '../../hooks/module-api';
import { getRec } from './cvrec.serialize';

interface RecMsg {
  t: string;
  pos?: number;
  buf?: ArrayLike<number>;
}

/** No grid to draw — this component exists to mirror the processor's live recording back
    onto `m.ext.cvrec` (via `{t:'rec', pos, buf}`) so `cvrec.serialize.ts` has something
    current to save, plus a small step readout. */
export function CvRecParts({ m }: { m: ModuleInstance }): ReactNode {
  const [pos, setPos] = useState(1);
  const rec = getRec(m);
  useWorkletFeed<RecMsg>(m, (msg) => {
    if (msg.t !== 'rec' || !msg.buf) return;
    rec.buf = Array.from(msg.buf);
    setPos((msg.pos ?? 0) + 1);
  });
  return <div className="text-screen">STEP {pos}</div>;
}

export const parts = CvRecParts;
