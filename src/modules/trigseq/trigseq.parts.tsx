import { useReducer, type ReactNode } from 'react';
import type { ModuleInstance } from '../../engine/types';
import { usePortSend } from '../../hooks/module-api';
import { Led } from '../../ui/atoms/led';
import { StepGrid } from '../../ui/atoms/step-grid';
import { getTrig, LANES, STEPS } from './trigseq.serialize';

/** TRIG SEQ editor: 4 lanes x 16 trigger buttons, reusing the same `.seq-gate` cell as
    SEQ-8/SEQ-16. Per-lane LENGTH lives on the normal LEN 1..4 knobs, laid out by the
    standard panel grid — only the grid itself needs custom React. */
export function TrigSeqParts({ m }: { m: ModuleInstance }): ReactNode {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const send = usePortSend<{ t: 'cell'; lane: number; i: number; v: 0 | 1 }>(m);
  const grid = getTrig(m);

  return (
    <StepGrid
      rows={LANES}
      cols={STEPS}
      renderCell={(row, col) => {
        const lane = grid.lanes[row];
        const v = lane?.[col] ?? 0;
        return (
          <button
            type="button"
            className="seq-gate"
            aria-label={`lane ${row + 1} step ${col + 1}`}
            aria-pressed={v === 1}
            onClick={() => {
              const nv: 0 | 1 = v ? 0 : 1;
              if (lane) lane[col] = nv;
              send({ t: 'cell', lane: row, i: col, v: nv });
              bump();
            }}
          >
            <Led on={v === 1} />
          </button>
        );
      }}
    />
  );
}

export const parts = TrigSeqParts;
