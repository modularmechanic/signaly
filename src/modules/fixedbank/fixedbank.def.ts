import type { KnobDef, ModuleDef } from '../../core/types';

// Labels carry the tuning so a screen reader (or a glance) knows which band a fader is —
// eight faders all called "BAND" would be indistinguishable, same reasoning as MIX 8's per-
// channel labels.
const LABELS = ['100HZ', '200HZ', '400HZ', '800HZ', '1.6K', '3.2K', '6.4K', '12.8K'];

const knobs: KnobDef[] = LABELS.map((label, i): KnobDef => ({
  id: `b${i + 1}`,
  label,
  min: 0,
  max: 1,
  initial: 0.7,
  fmt: 'fPc',
  fader: true,
}));

export const def: ModuleDef = {
  id: 'fixedbank',
  name: 'FIXED BANK',
  sub: 'EIGHT-BAND FILTER BANK',
  hp: 12,
  cat: 'FILTERS',
  look: 'lab',
  worklet: 'fixedbank',
  knobs,
  ins: [{ id: 'in', label: 'IN', kind: 'a' }],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};
