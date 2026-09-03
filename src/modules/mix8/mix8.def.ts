import type { JackDef, KnobDef, ModuleDef, PanelNode, SwitchDef } from '../../core/types';
import { EQ_F, EQ_Q, NB, NCH } from './mix8.eq';

const chs = Array.from({ length: NCH }, (_, i) => i + 1);
const bands = Array.from({ length: NB }, (_, i) => i + 1);
const TAG = ['LO', 'LM', 'HM', 'HI'];

/** Rendered by mix8.parts, not by a panel node — one set edits the SELected channel. */
export const EQ_KNOBS: KnobDef[] = bands.flatMap((b) => [
  {
    id: `eq${b}f`,
    label: `${TAG[b - 1]} F`,
    min: 20,
    max: 18000,
    initial: EQ_F[b - 1] ?? 1000,
    fmt: 'fHz',
    curve: 'log',
  },
  { id: `eq${b}g`, label: `${TAG[b - 1]} G`, min: -18, max: 18, initial: 0, fmt: 'f1' },
  { id: `eq${b}q`, label: `${TAG[b - 1]} Q`, min: 0.3, max: 8, initial: EQ_Q, fmt: 'f1', curve: 'log' },
]);

const knobs: KnobDef[] = [
  ...chs.map((n): KnobDef => ({
    id: `l${n}`,
    label: `CH ${n}`,
    min: 0,
    max: 1,
    initial: 0.75,
    fmt: 'fPc',
    fader: true,
  })),
  { id: 'master', label: 'MAIN', min: 0, max: 1, initial: 0.8, fmt: 'fPc', fader: true },
  ...chs.map((n): KnobDef => ({ id: `p${n}`, label: `PAN ${n}`, min: -1, max: 1, initial: 0, fmt: 'f1' })),
  // Post-fader aux sends, one per channel per bus, down by default as on a console.
  ...chs.map((n): KnobDef => ({
    id: `snd1_${n}`,
    label: `SND1 ${n}`,
    min: 0,
    max: 1,
    initial: 0,
    fmt: 'fPc',
  })),
  ...chs.map((n): KnobDef => ({
    id: `snd2_${n}`,
    label: `SND2 ${n}`,
    min: 0,
    max: 1,
    initial: 0,
    fmt: 'fPc',
  })),
  // Return levels blend the effect back into the main bus in parallel with the dry mix.
  { id: 'ret1', label: 'RET 1', min: 0, max: 1, initial: 0.8, fmt: 'fPc' },
  { id: 'ret2', label: 'RET 2', min: 0, max: 1, initial: 0.8, fmt: 'fPc' },
  ...EQ_KNOBS,
];

const sws: SwitchDef[] = [
  { id: 'sel', label: 'EQ CH', options: chs.map(String), initial: 0 },
  ...chs.map((n): SwitchDef => ({ id: `m${n}`, label: `MUTE ${n}`, options: ['OFF', 'ON'], initial: 0 })),
];

const ins: JackDef[] = [
  ...chs.map((n): JackDef => ({ id: `in${n}`, label: `IN ${n}`, kind: 'a' })),
  { id: 'r1l', label: 'RET1 L', kind: 'a' },
  { id: 'r1r', label: 'RET1 R', kind: 'a' },
  { id: 'r2l', label: 'RET2 L', kind: 'a' },
  { id: 'r2r', label: 'RET2 R', kind: 'a' },
];

const outs: JackDef[] = [
  { id: 's1l', label: 'SND1 L', kind: 'a' },
  { id: 's1r', label: 'SND1 R', kind: 'a' },
  { id: 's2l', label: 'SND2 L', kind: 'a' },
  { id: 's2r', label: 'SND2 R', kind: 'a' },
  { id: 'outl', label: 'OUT L', kind: 'a' },
  { id: 'outr', label: 'OUT R', kind: 'a' },
];

// Authored geometry: the computed grid caps at 4 knob columns, which turns 8 channel
// strips into stacked rows of 4 and leaves ~25px per row once the jacks and the EQ
// display have taken their bands. A console is columns, so the columns are authored.
const COL_W = 0.0925;
const col = (i: number): number => 0.018 + i * 0.0965;
const MASTER_X = 0.845;
const MASTER_W = 0.137;

const row = (y: number, h: number, id: string, kind: PanelNode['kind'], i: number): PanelNode => ({
  id,
  kind,
  x: col(i),
  y,
  w: COL_W,
  h,
});

const jacks = (list: JackDef[], pre: 'in' | 'out', y: number, cols: number): PanelNode[] =>
  list.map((j, i) => ({
    id: `${pre}:${j.id}`,
    kind: pre,
    x: 0.018 + (i * 0.964) / cols,
    y,
    w: 0.964 / cols,
    h: 0.1,
  }));

// A console strip reads top to bottom: fader, pan, sends, mute. Knob rows are 0.08 of the 658 px
// panel (53 px), clear of the 37 px floor under which controls.css drops the label. The master
// column has spare height under its fader, which is where the two return levels live.
const nodes: PanelNode[] = [
  ...chs.map((n, i) => row(0.098, 0.19, `fader:l${n}`, 'fader', i)),
  { id: 'fader:master', kind: 'fader', x: MASTER_X, y: 0.098, w: MASTER_W, h: 0.19 },
  ...chs.map((n, i) => row(0.292, 0.08, `knob:p${n}`, 'knob', i)),
  ...chs.map((n, i) => row(0.376, 0.08, `knob:snd1_${n}`, 'knob', i)),
  ...chs.map((n, i) => row(0.46, 0.08, `knob:snd2_${n}`, 'knob', i)),
  { id: 'knob:ret1', kind: 'knob', x: MASTER_X, y: 0.292, w: MASTER_W, h: 0.08 },
  { id: 'knob:ret2', kind: 'knob', x: MASTER_X, y: 0.376, w: MASTER_W, h: 0.08 },
  ...chs.map((n, i) => row(0.544, 0.056, `switch:m${n}`, 'switch', i)),
  { id: 'display:text', kind: 'display', x: 0.018, y: 0.606, w: 0.964, h: 0.148 },
  ...jacks(ins, 'in', 0.76, 12),
  ...jacks(outs, 'out', 0.864, 6),
];

export const def: ModuleDef = {
  id: 'mix8',
  name: 'MIX 8',
  sub: 'STEREO · 4-BAND EQ',
  hp: 36,
  cat: 'AMP / MIX',
  worklet: 'mix8',
  knobs,
  sws,
  ins,
  outs,
  display: 'text',
  panel: { nodes },
};
