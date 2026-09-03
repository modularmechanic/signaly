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
import {
  BOTTOM_PAD,
  HEADER_GAP,
  HEADER_H,
  JACK_GAP,
  JACK_ROW_H,
  jackColsFor,
} from '../../modules/panel-layout';
import { MIN_ROW_HP } from '../../state/settings-store';
import type { UserDef } from './schema';
import { bad, bool, list, num, obj, opt, pick, str, unit } from './validate-primitives';

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
export const DISPLAYS: readonly string[] = ['scope', 'meter', 'steps', 'env', 'piano', 'text'];
export const JACK_KINDS: readonly string[] = ['a', 'p', 'g', 'c'];
const NODE_KIND: readonly string[] = ['knob', 'fader', 'switch', 'led', 'in', 'out', 'display', 'label'];
const FREE_PREFIX: readonly string[] = ['label', 'display'];
const EPS = 1e-9;
const FIXED_H = HEADER_H + HEADER_GAP + JACK_GAP + BOTTOM_PAD;

/** The auto layout pins jack rows to the bottom under a fixed header; past that the knob
    band collapses to zero height and jacks stack on top of each other. */
function jacksFit(hp: number, ins: number, outs: number): boolean {
  const cols = jackColsFor(hp);
  return FIXED_H + (Math.ceil(ins / cols) + Math.ceil(outs / cols)) * JACK_ROW_H <= 1 + EPS;
}

export function validateSlug(v: unknown): v is string {
  return typeof v === 'string' && SLUG.test(v);
}

function jacks(v: unknown, at: string): JackDef[] {
  const out: JackDef[] = [];
  const seen = new Set<string>();
  list(v, at, 8).forEach((raw, i) => {
    const o = obj(raw, `${at}[${i}]`);
    const id = str(o.id, `${at}[${i}].id`, 24);
    if (seen.has(id)) bad(`${at} has a duplicate jack id "${id}"`);
    seen.add(id);
    out.push({
      id,
      label: str(o.label, `${at}[${i}].label`, 16),
      kind: pick(o.kind, `${at}[${i}].kind`, JACK_KINDS) as Kind,
    });
  });
  return out;
}

function knobs(v: unknown, ins: JackDef[]): KnobDef[] {
  const out: KnobDef[] = [];
  const seen = new Set<string>();
  const att1 = new Set<string>();
  list(v, 'knobs', 16).forEach((raw, i) => {
    const at = `knobs[${i}]`;
    const o = obj(raw, at);
    const id = str(o.id, `${at}.id`, 24);
    if (seen.has(id)) bad(`knobs has a duplicate id "${id}"`);
    seen.add(id);
    const min = num(o.min, `${at}.min`);
    const max = num(o.max, `${at}.max`);
    if (min >= max) bad(`${at}.min must be less than ${at}.max`);
    const initial = num(o.initial, `${at}.initial`);
    if (initial < min || initial > max) bad(`${at}.initial must be within [${min}, ${max}]`);
    const k: KnobDef = { id, label: str(o.label, `${at}.label`, 16), min, max, initial };
    const fmt = opt(o.fmt);
    if (fmt !== undefined) k.fmt = pick(fmt, `${at}.fmt`, FMT_NAMES) as FmtName;
    const curve = opt(o.curve);
    if (curve !== undefined) k.curve = pick(curve, `${at}.curve`, ['lin', 'log']) as 'lin' | 'log';
    const big = opt(o.big);
    if (big !== undefined) k.big = bool(big, `${at}.big`);
    const fader = opt(o.fader);
    if (fader !== undefined) k.fader = bool(fader, `${at}.fader`);
    const cvIn = opt(o.cvIn);
    if (cvIn !== undefined) {
      const j = str(cvIn, `${at}.cvIn`, 24);
      if (!ins.some((x) => x.id === j)) bad(`${at}.cvIn "${j}" names no input jack`);
      k.cvIn = j;
    }
    const att = opt(o.attenuates);
    if (att !== undefined) {
      const j = str(att, `${at}.attenuates`, 24);
      if (!ins.some((x) => x.id === j && x.kind === 'c'))
        bad(`${at}.attenuates "${j}" must name a 'c' input`);
      // Two gains on one jack would leave the second unwired; one attenuator per input.
      if (att1.has(j)) bad(`${at}.attenuates "${j}" is already attenuated by another knob`);
      att1.add(j);
      k.attenuates = j;
    }
    out.push(k);
  });
  return out;
}

function switches(v: unknown): SwitchDef[] {
  const out: SwitchDef[] = [];
  const seen = new Set<string>();
  list(v, 'sws', 8).forEach((raw, i) => {
    const at = `sws[${i}]`;
    const o = obj(raw, at);
    const id = str(o.id, `${at}.id`, 24);
    if (seen.has(id)) bad(`sws has a duplicate id "${id}"`);
    seen.add(id);
    const options = list(o.options, `${at}.options`, 16).map((x, n) => str(x, `${at}.options[${n}]`, 16));
    if (options.length < 2) bad(`${at}.options needs at least 2 entries`);
    const s: SwitchDef = { id, label: str(o.label, `${at}.label`, 16), options };
    const d = opt(o.initial);
    if (d !== undefined) {
      const n = num(d, `${at}.initial`);
      if (!Number.isInteger(n) || n < 0 || n >= options.length) bad(`${at}.initial must index options`);
      s.initial = n;
    }
    out.push(s);
  });
  return out;
}

function leds(v: unknown): string[] {
  const seen = new Set<string>();
  return list(v, 'leds', 8).map((raw, i) => {
    const id = str(raw, `leds[${i}]`, 16);
    if (!/^[a-z0-9_-]+$/.test(id) || seen.has(id)) bad(`leds[${i}] must be a unique [a-z0-9_-] id`);
    seen.add(id);
    return id;
  });
}

function panel(v: unknown, d: UserDef): PanelLayout {
  const o = obj(v, 'panel');
  const knobIds = new Set(d.knobs.map((k) => k.id));
  const targets: Record<string, Set<string> | undefined> = {
    knob: knobIds,
    fader: knobIds,
    switch: new Set((d.sws ?? []).map((s) => s.id)),
    led: new Set(d.leds ?? []),
    in: new Set(d.ins.map((j) => j.id)),
    out: new Set(d.outs.map((j) => j.id)),
  };
  const seen = new Set<string>();
  const nodes = list(o.nodes, 'panel.nodes', 64).map((raw, i): PanelNode => {
    const at = `panel.nodes[${i}]`;
    const n = obj(raw, at);
    const id = str(n.id, `${at}.id`, 48);
    if (seen.has(id)) bad(`panel.nodes has a duplicate id "${id}"`);
    seen.add(id);
    const sep = id.indexOf(':');
    const prefix = sep < 0 ? id : id.slice(0, sep);
    const target = sep < 0 ? '' : id.slice(sep + 1);
    const need = targets[prefix];
    if (need) {
      if (!need.has(target)) bad(`${at}.id "${id}" names no ${prefix}`);
    } else if (!FREE_PREFIX.includes(prefix)) {
      bad(`${at}.id "${id}" has an unknown prefix`);
    }
    const x = unit(n.x, `${at}.x`);
    const y = unit(n.y, `${at}.y`);
    const w = unit(n.w, `${at}.w`);
    const h = unit(n.h, `${at}.h`);
    if (x + w > 1 + EPS) bad(`${at} overflows the panel horizontally`);
    if (y + h > 1 + EPS) bad(`${at} overflows the panel vertically`);
    const node: PanelNode = { id, kind: pick(n.kind, `${at}.kind`, NODE_KIND) as PanelNodeKind, x, y, w, h };
    const label = opt(n.label);
    if (label !== undefined) node.label = str(label, `${at}.label`, 16);
    return node;
  });
  return { nodes };
}

/** First failure wins, with a message the builder chat can show verbatim. */
export function validateUserDef(o: unknown): { ok: true; def: UserDef } | { ok: false; error: string } {
  try {
    const r = obj(o, 'def');
    const hp = num(r.hp, 'def.hp');
    if (!Number.isInteger(hp) || hp < 1 || hp > MIN_ROW_HP)
      bad(
        `def.hp must be an integer from 1 to ${MIN_ROW_HP}: a module has to fit the narrowest row a rack can be set to (${MIN_ROW_HP} HP), or it could never be placed`,
      );
    const ins = jacks(r.ins, 'ins');
    const outs = jacks(r.outs, 'outs');
    if (!jacksFit(hp, ins.length, outs.length)) {
      let need = hp;
      while (need < MIN_ROW_HP && !jacksFit(need, ins.length, outs.length)) need++;
      bad(
        jacksFit(need, ins.length, outs.length)
          ? `def.hp ${hp} is too narrow for ${ins.length} in and ${outs.length} out jacks — use at least ${need} HP`
          : `${ins.length} in and ${outs.length} out jacks fit no panel — use fewer jacks`,
      );
    }
    const def: UserDef = {
      name: str(r.name, 'def.name', 24),
      sub: str(r.sub, 'def.sub', 32),
      hp,
      cat: pick(r.cat, 'def.cat', CAT_ORDER) as Cat,
      knobs: knobs(r.knobs, ins),
      ins,
      outs,
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
    if (p !== undefined) def.panel = panel(p, def);
    return { ok: true, def };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'invalid module definition' };
  }
}
