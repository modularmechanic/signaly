import { useState, type ReactNode } from 'react';
import type { ModuleInstance } from '../../engine/types';
import { useWorkletFeed } from '../../hooks/module-api';
import { getRec } from './cvrec.serialize';

interface RecMsg {
  t: string;
  i?: number;
  v?: number;
}

/** No grid to draw — this component exists to mirror the processor's live recording back
    onto `m.ext.cvrec` (via `{t:'rec', i, v}`, one per written step) so `cvrec.serialize.ts` has something
    current to save, plus a small step readout. */
export function CvRecParts({ m }: { m: ModuleInstance }): ReactNode {
  const [pos, setPos] = useState(1);
  const rec = getRec(m);
  useWorkletFeed<RecMsg>(m, (msg) => {
    if (msg.t !== 'rec' || msg.i === undefined || msg.v === undefined) return;
    rec.buf[msg.i] = msg.v;
    setPos(msg.i + 1);
  });
  return <div className="text-screen">STEP {pos}</div>;
}

export const parts = CvRecParts;
