import type { KnobDef, ModuleDef } from '../../core/types';

/** One panel row per input: A's four sends, then B's, C's and D's. */
const ROWS = ['a', 'b', 'c', 'd'] as const;
const BUSES = [1, 2, 3, 4] as const;

const cells: KnobDef[] = ROWS.flatMap((r) =>
  BUSES.map((n): KnobDef => ({
    id: `${r}${n}`,
    label: `${r.toUpperCase()}${n}`,
    min: 0,
    max: 1,
    initial: 0,
    fmt: 'fPc',
  })),
);

export const def: ModuleDef = {
  id: 'matrix',
  name: 'MATRIX',
  sub: '4 x 4 MATRIX MIXER',
  hp: 12,
  cat: 'AMP / MIX',
  look: 'grid',
  worklet: 'matrix',
  knobs: cells,
  ins: ROWS.map((r) => ({ id: r, label: r.toUpperCase(), kind: 'a' as const })),
  outs: BUSES.map((n) => ({ id: `o${n}`, label: `${n}`, kind: 'a' as const })),
};
