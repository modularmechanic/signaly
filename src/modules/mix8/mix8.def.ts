import type { JackDef, KnobDef, ModuleDef, PanelNode, SwitchDef } from '../../core/types';
import { MID_F, NCH } from './mix8.eq';

const chs = Array.from({ length: NCH }, (_, i) => i + 1);

const gain = (id: string, label: string): KnobDef => ({
  id,
  label,
  min: -15,
  max: 15,
  initial: 0,
  fmt: 'f1',
});
const level = (id: string, label: string, initial: number): KnobDef => ({
  id,
  label,
  min: 0,
  max: 1,
  initial,
  fmt: 'fPc',
});

// Labels carry the channel number: eight knobs all called PAN would be indistinguishable to a
// screen reader, and the accessible name is the label.
const knobs: KnobDef[] = [
  ...chs.map((n): KnobDef => ({ ...level(`l${n}`, `CH ${n}`, 0.75), fader: true })),
  { ...level('master', 'MAIN', 0.8), fader: true },
  ...chs.map((n): KnobDef => ({ id: `p${n}`, label: `PAN ${n}`, min: -1, max: 1, initial: 0, fmt: 'f1' })),
  ...chs.map((n) => gain(`hi${n}`, `HI ${n}`)),
  ...chs.map((n) => gain(`mid${n}`, `MID ${n}`)),
  ...chs.map((n): KnobDef => ({
    id: `mf${n}`,
    label: `MF ${n}`,
    min: 200,
    max: 5000,
    initial: MID_F,
    fmt: 'fHz',
    curve: 'log',
  })),
  ...chs.map((n) => gain(`lo${n}`, `LO ${n}`)),
  // Post-fader aux sends, down by default as on a console.
  ...chs.map((n) => level(`snd1_${n}`, `S1 ${n}`, 0)),
  ...chs.map((n) => level(`snd2_${n}`, `S2 ${n}`, 0)),
  // Return levels blend the effect back into the main bus in parallel with the dry mix.
  level('ret1', 'RET 1', 0.8),
  level('ret2', 'RET 2', 0.8),
];

// One option renders as a lit push-button toggle: the M and S of every desk.
const sws: SwitchDef[] = [
  ...chs.map((n): SwitchDef => ({ id: `m${n}`, label: `MUTE ${n}`, options: ['M'], initial: 0 })),
  ...chs.map((n): SwitchDef => ({ id: `s${n}`, label: `SOLO ${n}`, options: ['S'], initial: 0 })),
  // PRE lifts both of a channel's sends ahead of its fader (post-EQ), so a wet effect can carry
  // a channel whose fader is down — the classic reverb-tail trick.
  ...chs.map((n): SwitchDef => ({ id: `pre${n}`, label: `PRE ${n}`, options: ['PRE'], initial: 0 })),
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

// Authored geometry: a console is eight identical strips read top to bottom — input, EQ, sends,
// pan, mute/solo, fader — with the master fader beside them and every send/return jack in one
// strip along the bottom. The computed grid caps at four knob columns and cannot express that.
const COL_W = 0.0925;
const HALF = COL_W / 2;
const col = (i: number): number => 0.018 + i * 0.0965;
const MASTER_X = 0.845;
const MASTER_W = 0.137;
const KNOB_H = 0.075; // 49 px of 658: clear of the 37 px floor under which the label is dropped

const cell = (
  id: string,
  kind: PanelNode['kind'],
  x: number,
  y: number,
  w: number,
  h: number,
): PanelNode => ({
  id,
  kind,
  x,
  y,
  w,
  h,
});
const strip = (y: number, h: number, kind: PanelNode['kind'], id: (n: number) => string): PanelNode[] =>
  chs.map((n, i) => cell(id(n), kind, col(i), y, COL_W, h));
const pair = (
  y: number,
  kind: PanelNode['kind'],
  l: (n: number) => string,
  r: (n: number) => string,
): PanelNode[] =>
  chs.flatMap((n, i) => [
    cell(l(n), kind, col(i), y, HALF, kind === 'switch' ? 0.05 : KNOB_H),
    cell(r(n), kind, col(i) + HALF, y, HALF, kind === 'switch' ? 0.05 : KNOB_H),
  ]);

// Bottom strip is jacks only, grouped: the four send outs, the four return ins, the main outs.
// The return LEVELS live in the master section above the main fader, as on a desk.
const BOTTOM = [
  'out:s1l',
  'out:s1r',
  'out:s2l',
  'out:s2r',
  'in:r1l',
  'in:r1r',
  'in:r2l',
  'in:r2r',
  'out:outl',
  'out:outr',
];
const BW = 0.964 / BOTTOM.length;

const nodes: PanelNode[] = [
  ...strip(0.115, 0.085, 'in', (n) => `in:in${n}`),
  ...pair(
    0.205,
    'knob',
    (n) => `knob:hi${n}`,
    (n) => `knob:mid${n}`,
  ),
  ...pair(
    0.285,
    'knob',
    (n) => `knob:mf${n}`,
    (n) => `knob:lo${n}`,
  ),
  ...pair(
    0.365,
    'knob',
    (n) => `knob:snd1_${n}`,
    (n) => `knob:snd2_${n}`,
  ),
  ...strip(0.445, KNOB_H, 'knob', (n) => `knob:p${n}`),
  ...pair(
    0.525,
    'switch',
    (n) => `switch:m${n}`,
    (n) => `switch:s${n}`,
  ),
  ...strip(0.578, 0.045, 'switch', (n) => `switch:pre${n}`),
  ...strip(0.628, 0.252, 'fader', (n) => `fader:l${n}`),
  cell('knob:ret1', 'knob', MASTER_X, 0.205, MASTER_W, KNOB_H),
  cell('knob:ret2', 'knob', MASTER_X, 0.285, MASTER_W, KNOB_H),
  cell('fader:master', 'fader', MASTER_X, 0.365, MASTER_W, 0.515),
  ...BOTTOM.map((id, k) => cell(id, id.split(':')[0] as PanelNode['kind'], 0.018 + k * BW, 0.885, BW, 0.095)),
];

export const def: ModuleDef = {
  id: 'mix8',
  name: 'MIX 8',
  sub: 'STEREO CONSOLE · 3-BAND EQ',
  hp: 36,
  cat: 'AMP / MIX',
  look: 'slateware',
  worklet: 'mix8',
  knobs,
  sws,
  ins,
  outs,
  panel: { nodes },
};
