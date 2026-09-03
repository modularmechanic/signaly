import { CAT_ORDER, KIND_NAME } from '../../core/types';
import { MIN_ROW_HP } from '../../state/settings-store';
import { DISPLAYS, FMT_NAMES } from '../user-modules/validate';

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
  hp: integer 1..${MIN_ROW_HP} panel width (1 HP = 26px, panel is 658px tall). 4-8 HP suits most modules.
  cat: one of ${CAT_ORDER.join(' | ')}
  dark?: boolean, dark faceplate.
  knobs: <=16 of { id, label(<=16), min, max, initial, fmt?, curve?, big?, fader?, cvIn?, attenuates? }
    initial must sit inside [min,max]. fmt is one of ${FMT_NAMES.join(' ')}. curve is 'lin' or 'log'.
    cvIn names an input jack that modulates this knob (a display hint only).
    attenuates names a 'c' input jack — the engine inserts the gain, so never scale that input in DSP.
  sws?: <=8 of { id, label(<=16), options (2..16 strings, <=16 chars), initial? option index }
  ins / outs: <=8 each of { id, label(<=16), kind }; kind is a=${KIND_NAME.a} p=${KIND_NAME.p} (1V/oct) g=${KIND_NAME.g} c=${KIND_NAME.c}.
  display?: one of ${DISPLAYS.join(' ')}
  leds?: <=8 unique [a-z0-9_-] ids (<=16 chars), each an indicator the DSP lights with { t: 'led', id, v }.
  panel?: OPTIONAL { nodes: [{ id, kind, x, y, w, h, label? }] } in 0..1 panel coordinates, <=64 nodes,
    x+w<=1 and y+h<=1. Node ids: knob:<knobId> fader:<knobId> switch:<swId> in:<jackId> out:<jackId>
    led:<ledId> label:<any> display:<display>. Include panel ONLY when the user asks for a specific layout
    or is aligning controls to a faceplate image; otherwise omit it and the app lays the panel out itself.

DSP — exactly one class, no imports, no exports:
  class P extends Base {
    defaults() { return { freq: 440, amt: 0.5 }; }   // every knob and switch id -> initial value
    process(I, O) {
      const out = O[0][0], n = out.length;           // read .length, never assume 128
      for (let i = 0; i < n; i++) out[i] = 0;
      return true;
    }
  }
  registerProcessor('user:<slug>', P);
  I and O are ordered exactly as def.ins / def.outs; every jack is one mono channel.
  this.p holds live knob and switch values by id (a switch is its option index).
  Per-instance state belongs in constructor(o) { super(o); ... }.

AVAILABLE SYMBOLS — nothing else exists in worklet scope:
  Base ch clamp TP flush blep oscW DL OnePole onePoleCoeff lpCoeff Lcg ClockSync SYNC_DIV sampleRate
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
