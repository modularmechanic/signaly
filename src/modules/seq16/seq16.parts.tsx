import { useReducer, useState, type ReactNode } from 'react';
import type { ModuleInstance } from '../../engine/types';
import { usePortSend, useWorkletFeed } from '../../hooks/module-api';
import { Led } from '../../ui/atoms/led';
import { StepGrid } from '../../ui/atoms/step-grid';
import { getSeq16, STEPS } from './seq16.serialize';

interface StepMsg {
  t: string;
  i: number;
}

/** SEQ-16 editor: row 0 toggles the gate, row 1 toggles slide (portamento into that step),
    row 2 sets the pitch in semitones. The pattern lives on `m.ext.seq16`; React only holds
    the playhead index. Reuses the same `.seq-gate` / `.seq-pitch` cells as SEQ-8. */
export function Seq16Parts({ m }: { m: ModuleInstance }): ReactNode {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const [play, setPlay] = useState(-1);
  /** Text of the pitch cell being typed into: "-" is not a number yet, and must survive the render. */
  const [draft, setDraft] = useState<{ i: number; text: string } | null>(null);
  const send = usePortSend<{ t: 'step'; i: number; pitch: number; gate: 0 | 1; slide: 0 | 1 }>(m);
  const seq = getSeq16(m);

  useWorkletFeed<StepMsg>(m, (msg) => {
    if (msg.t === 'step') setPlay(msg.i);
  });

  const edit = (i: number, pitch: number, gate: 0 | 1, slide: 0 | 1): void => {
    const step = seq.steps[i];
    if (!step) return;
    step.pitch = pitch;
    step.gate = gate;
    step.slide = slide;
    send({ t: 'step', i, pitch, gate, slide });
    bump();
  };

  return (
    <StepGrid
      rows={3}
      cols={STEPS}
      renderCell={(row, col) => {
        const step = seq.steps[col];
        if (!step) return null;
        if (row === 0) {
          return (
            <button
              type="button"
              className="seq-gate"
              aria-label={`step ${col + 1} gate`}
              aria-pressed={step.gate === 1}
              onClick={() => edit(col, step.pitch, step.gate ? 0 : 1, step.slide)}
            >
              <Led on={play === col ? 1 : step.gate === 1} />
            </button>
          );
        }
        if (row === 1) {
          return (
            <button
              type="button"
              className="seq-gate"
              aria-label={`step ${col + 1} slide`}
              aria-pressed={step.slide === 1}
              onClick={() => edit(col, step.pitch, step.gate, step.slide ? 0 : 1)}
            >
              <Led on={step.slide === 1} />
            </button>
          );
        }
        return (
          <input
            className="seq-pitch"
            type="number"
            min={-24}
            max={24}
            step={1}
            value={draft?.i === col ? draft.text : step.pitch}
            aria-label={`step ${col + 1} pitch`}
            onChange={(e) => {
              const v = e.target.valueAsNumber;
              if (Number.isNaN(v)) return setDraft({ i: col, text: e.target.value });
              setDraft(null);
              edit(col, Math.max(-24, Math.min(24, v)), step.gate, step.slide);
            }}
            onBlur={() => setDraft(null)}
          />
        );
      }}
    />
  );
}

export const parts = Seq16Parts;
