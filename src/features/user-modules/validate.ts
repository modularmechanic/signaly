import type {
  Cat,
  Display,
  FmtName,
  JackDef,
  Kind,
  KnobDef,
  PanelLayout,
  PanelNode,
  PanelNodeKind,
  SwitchDef,
} from '../../core/types';
import { CAT_ORDER } from '../../core/types';
import { DISPLAY_CONTRACT } from '../../modules/display-contract';
import { checkDef } from './check-def';
import type { UserDef } from './schema';
import { bad, bool, list, num, obj, opt, pick, str } from './validate-primitives';

const SLUG = /^[a-z0-9-]{3,32}$/;
export const FMT_NAMES: readonly string[] = [
  'fHz',
  'fMs',
  'fPc',
  'f1',
  'fSemi',
  'fInt',
  'fKey',
  'fChord',
  'fShape',
  'fRate',
];
export const DISPLAYS: readonly string[] = Object.keys(DISPLAY_CONTRACT);
export const JACK_KINDS: readonly string[] = ['a', 'p', 'g', 'c'];

export function validateSlug(v: unknown): v is string {
  return typeof v === 'string' && SLUG.test(v);
}

// Everything below is shape only: types, lengths and list caps that exist because the input is
// untrusted LLM or imported JSON. Well-formedness rules live in check-def.ts, shared with the
// built-in sweep, and run once the loose object has been coerced into a UserDef.

function jacks(v: unknown, at: string): JackDef[] {
  return list(v, at, 8).map((raw, i): JackDef => {
    const o = obj(raw, `${at}[${i}]`);
    return {
      id: str(o.id, `${at}[${i}].id`, 24),
      label: str(o.label, `${at}[${i}].label`, 16),
      kind: pick(o.kind, `${at}[${i}].kind`, JACK_KINDS) as Kind,
    };
  });
}

function knobs(v: unknown): KnobDef[] {
  return list(v, 'knobs', 16).map((raw, i): KnobDef => {
    const at = `knobs[${i}]`;
    const o = obj(raw, at);
    // fmt is a unit and a quantisation, not a decoration — see FMT_RANGE in core/types.
    const fmt = opt(o.fmt);
    if (fmt === undefined) bad(`${at}.fmt is required — say which unit the knob is in`);
    const k: KnobDef = {
      id: str(o.id, `${at}.id`, 24),
      label: str(o.label, `${at}.label`, 16),
      min: num(o.min, `${at}.min`),
      max: num(o.max, `${at}.max`),
      initial: num(o.initial, `${at}.initial`),
      fmt: pick(fmt, `${at}.fmt`, FMT_NAMES) as FmtName,
    };
    const curve = opt(o.curve);
    if (curve !== undefined) k.curve = pick(curve, `${at}.curve`, ['lin', 'log']) as 'lin' | 'log';
    const big = opt(o.big);
    if (big !== undefined) k.big = bool(big, `${at}.big`);
    const fader = opt(o.fader);
    if (fader !== undefined) k.fader = bool(fader, `${at}.fader`);
    const cvIn = opt(o.cvIn);
    if (cvIn !== undefined) k.cvIn = str(cvIn, `${at}.cvIn`, 24);
    const att = opt(o.attenuates);
    if (att !== undefined) k.attenuates = str(att, `${at}.attenuates`, 24);
    return k;
  });
}

function switches(v: unknown): SwitchDef[] {
  return list(v, 'sws', 8).map((raw, i): SwitchDef => {
    const at = `sws[${i}]`;
    const o = obj(raw, at);
    const s: SwitchDef = {
      id: str(o.id, `${at}.id`, 24),
      label: str(o.label, `${at}.label`, 16),
      options: list(o.options, `${at}.options`, 16).map((x, n) => str(x, `${at}.options[${n}]`, 16)),
    };
    const d = opt(o.initial);
    if (d !== undefined) s.initial = num(d, `${at}.initial`);
    return s;
  });
}

const leds = (v: unknown): string[] => list(v, 'leds', 8).map((raw, i) => str(raw, `leds[${i}]`, 16));

function panel(v: unknown): PanelLayout {
  const o = obj(v, 'panel');
  const nodes = list(o.nodes, 'panel.nodes', 64).map((raw, i): PanelNode => {
    const at = `panel.nodes[${i}]`;
    const n = obj(raw, at);
    const node: PanelNode = {
      id: str(n.id, `${at}.id`, 48),
      kind: str(n.kind, `${at}.kind`, 32) as PanelNodeKind,
      x: num(n.x, `${at}.x`),
      y: num(n.y, `${at}.y`),
      w: num(n.w, `${at}.w`),
      h: num(n.h, `${at}.h`),
    };
    const label = opt(n.label);
    if (label !== undefined) node.label = str(label, `${at}.label`, 16);
    return node;
  });
  return { nodes };
}

function parse(o: unknown): UserDef {
  const r = obj(o, 'def');
  const def: UserDef = {
    name: str(r.name, 'def.name', 24),
    sub: str(r.sub, 'def.sub', 32),
    hp: num(r.hp, 'def.hp'),
    cat: pick(r.cat, 'def.cat', CAT_ORDER) as Cat,
    knobs: knobs(r.knobs),
    ins: jacks(r.ins, 'ins'),
    outs: jacks(r.outs, 'outs'),
  };
  const dark = opt(r.dark);
  if (dark !== undefined) def.dark = bool(dark, 'def.dark');
  const sws = opt(r.sws);
  if (sws !== undefined) def.sws = switches(sws);
  const display = opt(r.display);
  if (display !== undefined) def.display = pick(display, 'def.display', DISPLAYS) as Display;
  const l = opt(r.leds);
  if (l !== undefined) def.leds = leds(l);
  const p = opt(r.panel);
  if (p !== undefined) def.panel = panel(p);
  return def;
}

/** First failure wins, with a message the builder chat can show verbatim. */
export function validateUserDef(o: unknown): { ok: true; def: UserDef } | { ok: false; error: string } {
  let def: UserDef;
  try {
    def = parse(o);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'invalid module definition' };
  }
  const error = checkDef(def);
  return error === null ? { ok: true, def } : { ok: false, error };
}
