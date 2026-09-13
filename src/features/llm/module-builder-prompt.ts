import { CAT_ORDER, FMT_RANGE, KIND_NAME } from '../../core/types';
import preludeSrc from '../../engine/dsp-prelude.ts?raw';
import { DISPLAY_CONTRACT } from '../../modules/display-contract';
import { MIN_CONTROL_PX, PANEL_H } from '../../modules/panel-layout';
import { MIN_ROW_HP } from '../../state/settings-store';
import { FMT_NAMES } from '../user-modules/validate';

// checkDef rejects a knob whose range leaves its fmt's bounds; say so rather than let the
// model learn it from a rejection. Read from the same table the checker reads.
const FMT_BOUNDS = Object.entries(FMT_RANGE)
  .map(([name, r]) => `${name} needs min>=${r[0]} and max<=${r[1]}`)
  .join('; ');

// Read as raw text, never imported normally: dsp-prelude.ts extends AudioWorkletProcessor at
// module scope, which only exists inside a real worklet. Every top-level const/function/class
// export here IS what dsp-transpile.ts flattens into worklet scope, so this can never drift.
export const PRELUDE_SYMBOLS = [...preludeSrc.matchAll(/^export (?:const|function|class) (\w+)/gm)]
  .map((m) => m[1])
  .filter((name): name is string => Boolean(name));

type Schema = Record<string, unknown>;

const s = (type: string): Schema => ({ type });
const nul = (type: string): Schema => ({ type: [type, 'null'] });
const shape = (properties: Record<string, Schema>): Schema => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const list = (items: Schema): Schema => ({ type: 'array', items });
const orNull = (sch: Schema): Schema => ({ ...sch, type: [sch.type as string, 'null'] });

const KNOB = shape({
  id: s('string'),
  label: s('string'),
  min: s('number'),
  max: s('number'),
  initial: s('number'),
  fmt: nul('string'),
  curve: nul('string'),
  big: nul('boolean'),
  fader: nul('boolean'),
  cvIn: nul('string'),
  attenuates: nul('string'),
});

const SWITCH = shape({
  id: s('string'),
  label: s('string'),
  options: list(s('string')),
  initial: nul('integer'),
});
const JACK = shape({ id: s('string'), label: s('string'), kind: s('string') });
const PANEL_NODE = shape({
  id: s('string'),
  kind: s('string'),
  x: s('number'),
  y: s('number'),
  w: s('number'),
  h: s('number'),
  label: nul('string'),
});

// `screen` is deliberately absent: it reserves the display box for a module's `.parts.tsx`,
// and a user module has none. The only display a proposal may name is `display`.
const DEF = shape({
  name: s('string'),
  sub: s('string'),
  hp: s('integer'),
  cat: s('string'),
  dark: nul('boolean'),
  knobs: list(KNOB),
  sws: orNull(list(SWITCH)),
  ins: list(JACK),
  outs: list(JACK),
  display: nul('string'),
  leds: orNull(list(s('string'))),
  panel: orNull(shape({ nodes: list(PANEL_NODE) })),
});

export const PROPOSAL_SCHEMA: Schema = shape({
  slug: s('string'),
  def: DEF,
  dsp: s('string'),
  note: nul('string'),
});

const DROP = ['additionalProperties', '$schema', '$ref', 'oneOf', 'anyOf', 'allOf'];

/** Gemini takes an OpenAPI 3.0 subset: uppercase types, `nullable`, no unions or refs. */
export function geminiSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(geminiSchema);
  if (typeof node !== 'object' || node === null) return node;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node)) {
    if (DROP.includes(k)) continue;
    if (k !== 'type') {
      out[k] = geminiSchema(v);
    } else if (Array.isArray(v)) {
      const real = v.find((t) => t !== 'null');
      out.type = typeof real === 'string' ? real.toUpperCase() : 'STRING';
      if (v.includes('null')) out.nullable = true;
    } else if (typeof v === 'string') {
      out.type = v.toUpperCase();
    }
  }
  return out;
}

export const SYSTEM_PROMPT = `You author modules for Signaly, a browser modular synth. Return ONLY the tool/JSON payload — no prose, no markdown fences.

SLUG: matches [a-z0-9-]{3,32}, kebab-case, descriptive.

DEF — the panel and ports:
  name: <=24 chars. sub: <=32 chars, the small line under the name.
  hp: integer 1..${MIN_ROW_HP} panel width (1 HP = 26px, panel is ${PANEL_H}px tall). 4-8 HP suits most modules.
    The panel is laid out from the definition, and hp is rejected when the controls and jacks
    cannot fit in it ("use at least N HP"), so give a wide module the width it needs.
  cat: one of ${CAT_ORDER.join(' | ')}
  dark?: boolean, dark faceplate.
  knobs: <=16 of { id, label(<=16), min, max, initial, fmt, curve?, big?, fader?, cvIn?, attenuates? }
    min must be less than max, and initial must sit inside [min,max]. curve is 'lin' or 'log'.
    fmt is REQUIRED and is one of ${FMT_NAMES.join(' ')} — it is the knob's unit and its
    quantisation, not a decoration, so the range must suit it: ${FMT_BOUNDS}.
    cvIn names an input jack that modulates this knob (a display hint only).
    attenuates names a 'c' input jack — the engine inserts the gain, so never scale that input
    in DSP. At most ONE knob may attenuate any one jack, and such a knob is always
    { min: -1, max: 1, initial: 0, fmt: 'f1' }.
  sws?: <=8 of { id, label(<=16), options (2..16 strings, <=16 chars), initial? option index }
    A switch id shares one namespace with the knob ids: no id may appear in both lists.
  ins / outs: <=8 each of { id, label(<=16), kind }; kind is a=${KIND_NAME.a} p=${KIND_NAME.p} (1V/oct) g=${KIND_NAME.g} c=${KIND_NAME.c}.
  display?: one of the rows below, and the def MUST provide that row's side of it, or the
    module renders a "NO <DISPLAY>" placeholder. A row that asks for a native audio graph is a
    built-in only — never name it here.
${Object.entries(DISPLAY_CONTRACT)
  .map(([name, row]) => `    ${name} — ${row.needs}`)
  .join('\n')}
  leds?: <=8 unique [a-z0-9_-] ids (<=16 chars), each an indicator the DSP lights with { t: 'led', id, v }.
  panel?: OPTIONAL { nodes: [{ id, kind, x, y, w, h, label? }] } in 0..1 panel coordinates, <=64 nodes,
    x+w<=1 and y+h<=1. Node ids: knob:<knobId> fader:<knobId> switch:<swId> in:<jackId> out:<jackId>
    led:<ledId> label:<any> display:<display>. A 'fader' node needs h*${PANEL_H} >= ${MIN_CONTROL_PX.fader}px
    (h >= ${(MIN_CONTROL_PX.fader / PANEL_H).toFixed(3)}) or it is rejected. Include panel ONLY when the user asks for a specific
    layout or is aligning controls to a faceplate image; otherwise omit it and the app lays the panel out itself.

DSP — exactly one class, no imports, no exports:
  class P extends Base {
    process(I, O) {
      const out = O[0][0], n = out.length;           // read .length, never assume 128
      const { freq = 440, amt = 0.5 } = this.p;      // read params with a fallback, like this
      for (let i = 0; i < n; i++) out[i] = 0;
      return true;
    }
  }
  registerProcessor('user:<slug>', P);
  I and O are ordered exactly as def.ins / def.outs; every jack is one mono channel.
  this.p holds live knob and switch values by id (a switch is its option index). The def seeds
  it — every knob and switch initial is already in this.p before the first block, both in the
  rack and in the offline render that verifies this DSP — so do NOT write a defaults() method
  restating them. Still read every param with a fallback — const { x = 1 } = this.p, or
  this.p.x ?? 1 — because a bare this.p.x is how a DSP renders NaN and is rejected.
  Per-instance state belongs in constructor(o) { super(o); ... }.

AVAILABLE SYMBOLS — nothing else exists in worklet scope:
  ${PRELUDE_SYMBOLS.join(' ')} sampleRate
  ch(I, n) -> Float32Array | null (null when that input is unpatched)
  oscW(wave, t, dt): 0 sin, 1 tri, 2 saw, 3 square; t is phase 0..1, dt = freq / sampleRate
  flush(x) kills denormal tails. DL(n) is a fractional delay line (push / read).
  lpCoeff(hz) is a one-pole low-pass coefficient. new Lcg(seed).next() is reproducible -1..1 noise.
  OnePole(tauMs) smooths. ClockSync().tick(gate) returns the clock period in samples.

FORBIDDEN: import, export, fetch, eval, Function, window, document, localStorage, globalThis, any DOM
  or network API, and any allocation inside process().

SIGNALS are volts: audio +-5, gates 0 or 5, pitch CV 1V/oct with 0V = C4.
  Hz from pitch volts: 261.626 * Math.pow(2, v).
BUFFERS: read O[0][0].length every block; allocate nothing inside process().`;
