import { describe, expect, it } from 'vitest';
import { MIN_ROW_HP } from '../../state/settings-store';
import { validateSlug, validateUserDef } from './validate';

const good = (): Record<string, unknown> => ({
  name: 'Wobble',
  sub: 'lfo through a vca',
  hp: 6,
  cat: 'FX',
  knobs: [
    { id: 'rate', label: 'RATE', min: 0.1, max: 20, initial: 2, fmt: 'fHz', curve: 'log' },
    { id: 'amt', label: 'AMOUNT', min: -1, max: 1, initial: 0, fmt: 'f1', cvIn: 'cv', attenuates: 'cv' },
  ],
  sws: [{ id: 'wave', label: 'WAVE', options: ['SIN', 'TRI', 'SAW'], initial: 1 }],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'cv', label: 'CV', kind: 'c' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
  display: 'text',
  panel: {
    nodes: [
      { id: 'knob:rate', kind: 'knob', x: 0.1, y: 0.1, w: 0.5, h: 0.1, label: 'RATE' },
      { id: 'switch:wave', kind: 'switch', x: 0.1, y: 0.3, w: 0.8, h: 0.07 },
      { id: 'in:cv', kind: 'in', x: 0.1, y: 0.8, w: 0.3, h: 0.08 },
      { id: 'out:out', kind: 'out', x: 0.6, y: 0.8, w: 0.3, h: 0.08 },
    ],
  },
});

const withDef = (patch: Record<string, unknown>): Record<string, unknown> => ({ ...good(), ...patch });
const errorOf = (o: unknown): string => {
  const r = validateUserDef(o);
  expect(r.ok).toBe(false);
  return r.ok ? '' : r.error;
};

describe('validateSlug', () => {
  it('accepts kebab-case of 3..32 chars and nothing else', () => {
    expect(validateSlug('wobble-2')).toBe(true);
    expect(validateSlug('ab')).toBe(false);
    expect(validateSlug('Wobble')).toBe(false);
    expect(validateSlug('a'.repeat(33))).toBe(false);
    expect(validateSlug(7)).toBe(false);
  });
});

describe('validateUserDef', () => {
  it('accepts a complete definition and keeps its optional fields', () => {
    const r = validateUserDef(good());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.def.knobs[1]?.attenuates).toBe('cv');
    expect(r.def.sws?.[0]?.initial).toBe(1);
    expect(r.def.panel?.nodes).toHaveLength(4);
    expect(r.def.display).toBe('text');
  });

  it('treats null as absent for optional fields', () => {
    const r = validateUserDef(withDef({ display: null, sws: null, panel: null, dark: null }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.def.display).toBeUndefined();
  });

  it('reads a knob saved without fmt as f1, the way it has always displayed', () => {
    // Modules saved before fmt was required must still load: they are people's saved work.
    const legacy = good();
    const knobs = legacy.knobs as Record<string, unknown>[];
    delete knobs[0]!.fmt;
    knobs[1]!.fmt = null;
    const r = validateUserDef(legacy);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.def.knobs[0]?.fmt).toBe('f1');
    expect(r.def.knobs[1]?.fmt).toBe('f1');
  });

  it('still rejects an fmt that names no formatter', () => {
    const knobs = good().knobs as Record<string, unknown>[];
    knobs[0]!.fmt = 'fFurlongs';
    expect(errorOf(withDef({ knobs }))).toMatch(/knobs\[0\]\.fmt/);
  });

  describe('saved work is held to the rules it was written under', () => {
    // Rules added after a module was saved must not silently delete it. Each case below is
    // rejected as new work and accepted as saved work.
    const both = (def: Record<string, unknown>): { fresh: boolean; saved: boolean } => ({
      fresh: validateUserDef(def).ok,
      saved: validateUserDef(def, true).ok,
    });
    const knob = (over: Record<string, unknown>): Record<string, unknown> => ({
      id: 'x',
      label: 'X',
      min: 0,
      max: 1,
      initial: 0,
      fmt: 'f1',
      ...over,
    });

    it('a knob whose range does not suit its fmt', () => {
      const def = withDef({ knobs: [knob({ fmt: 'fMs', min: 20, max: 500, initial: 60 })], panel: null });
      expect(both(def)).toEqual({ fresh: false, saved: true });
    });

    it('a knob and a switch sharing an id', () => {
      const def = withDef({ knobs: [knob({ id: 'wave' })], panel: null });
      expect(both(def)).toEqual({ fresh: false, saved: true });
    });

    it('a display a worklet module can never feed', () => {
      const def = withDef({ display: 'scope', panel: null });
      expect(both(def)).toEqual({ fresh: false, saved: true });
    });

    it('a computed layout that does not fit its width', () => {
      const ins = Array.from({ length: 8 }, (_, i) => ({ id: `i${i}`, label: `I${i}`, kind: 'a' }));
      const outs = Array.from({ length: 8 }, (_, i) => ({ id: `o${i}`, label: `O${i}`, kind: 'a' }));
      const def = withDef({ hp: 1, knobs: [], sws: null, display: null, panel: null, ins, outs });
      expect(both(def)).toEqual({ fresh: false, saved: true });
    });

    it('an authored fader too short to use', () => {
      const def = withDef({
        knobs: [knob({ id: 'lvl', fader: true })],
        sws: null,
        panel: { nodes: [{ id: 'fader:lvl', kind: 'fader', x: 0.1, y: 0.1, w: 0.2, h: 0.02 }] },
      });
      expect(both(def)).toEqual({ fresh: false, saved: true });
    });

    it('but still rejects saved work that breaks a rule it was always held to', () => {
      const dupKnobs = withDef({ knobs: [knob({ id: 'a' }), knob({ id: 'a' })], panel: null });
      expect(both(dupKnobs)).toEqual({ fresh: false, saved: false });
      const inverted = withDef({ knobs: [knob({ min: 1, max: 0 })], panel: null });
      expect(both(inverted)).toEqual({ fresh: false, saved: false });
    });
  });

  it('rejects a non-object', () => expect(errorOf(null)).toMatch(/must be an object/));
  it('rejects an unknown cat', () => expect(errorOf(withDef({ cat: 'BLEEP' }))).toMatch(/def.cat/));
  it('accepts hp up to the narrowest row and rejects wider', () => {
    expect(validateUserDef(withDef({ hp: MIN_ROW_HP })).ok).toBe(true);
    expect(errorOf(withDef({ hp: MIN_ROW_HP + 1 }))).toMatch(/def.hp/);
  });
  it('rejects a name over 24 chars', () =>
    expect(errorOf(withDef({ name: 'x'.repeat(25) }))).toMatch(/def.name/));

  it('rejects more than 16 knobs', () => {
    const knobs = Array.from({ length: 17 }, (_, i) => ({
      id: `k${i}`,
      label: 'K',
      min: 0,
      max: 1,
      initial: 0,
      fmt: 'f1',
    }));
    expect(errorOf(withDef({ knobs }))).toMatch(/at most 16/);
  });

  it('rejects a knob default outside [min,max]', () => {
    const knobs = [{ id: 'a', label: 'A', min: 0, max: 1, initial: 2, fmt: 'f1' }];
    expect(errorOf(withDef({ knobs }))).toMatch(/within/);
  });

  it('rejects attenuates naming a non-CV input', () => {
    const knobs = [{ id: 'a', label: 'A', min: 0, max: 1, initial: 0, fmt: 'f1', attenuates: 'in' }];
    expect(errorOf(withDef({ knobs }))).toMatch(/must name a 'c' input/);
  });

  it('rejects cvIn naming no input', () => {
    const knobs = [{ id: 'a', label: 'A', min: 0, max: 1, initial: 0, fmt: 'f1', cvIn: 'nope' }];
    expect(errorOf(withDef({ knobs }))).toMatch(/names no input jack/);
  });

  it('rejects duplicate jack ids in one direction', () => {
    const outs = [
      { id: 'out', label: 'A', kind: 'a' },
      { id: 'out', label: 'B', kind: 'a' },
    ];
    expect(errorOf(withDef({ outs }))).toMatch(/duplicate jack id/);
  });

  it('rejects more than 8 inputs', () => {
    const ins = Array.from({ length: 9 }, (_, i) => ({ id: `i${i}`, label: 'I', kind: 'a' }));
    expect(errorOf(withDef({ ins, knobs: [] }))).toMatch(/at most 8/);
  });

  it('rejects a display a user module can never feed', () => {
    // scope draws m.ext.analyser, which only a native audio graph creates; user modules are worklets.
    expect(errorOf(withDef({ display: 'scope' }))).toMatch(/m\.ext\.analyser/);
    expect(errorOf(withDef({ display: 'piano' }))).toMatch(/native/);
    // env promises four named knobs and this def has none of them.
    expect(errorOf(withDef({ display: 'env' }))).toMatch(/knob "a" is missing/);
  });

  it('rejects an unknown display and an unknown fmt', () => {
    expect(errorOf(withDef({ display: 'lava' }))).toMatch(/def.display/);
    const knobs = [{ id: 'a', label: 'A', min: 0, max: 1, initial: 0, fmt: 'fLava' }];
    expect(errorOf(withDef({ knobs }))).toMatch(/fmt/);
  });

  it('rejects a panel node that names nothing', () => {
    const panel = { nodes: [{ id: 'knob:ghost', kind: 'knob', x: 0, y: 0, w: 0.2, h: 0.2 }] };
    expect(errorOf(withDef({ panel }))).toMatch(/names no knob/);
  });

  it('rejects panel geometry that leaves the panel', () => {
    const panel = { nodes: [{ id: 'knob:rate', kind: 'knob', x: 0.8, y: 0, w: 0.4, h: 0.2 }] };
    expect(errorOf(withDef({ panel }))).toMatch(/overflows/);
  });

  it('accepts leds and resolves led panel nodes against them', () => {
    const panel = { nodes: [{ id: 'led:clk', kind: 'led', x: 0, y: 0, w: 0.1, h: 0.1 }] };
    expect(validateUserDef(withDef({ leds: ['clk'], panel })).ok).toBe(true);
    expect(errorOf(withDef({ panel }))).toMatch(/names no led/);
    expect(errorOf(withDef({ leds: ['clk', 'clk'] }))).toMatch(/leds\[1\]/);
    expect(errorOf(withDef({ leds: ['CLK'] }))).toMatch(/leds\[0\]/);
  });

  it('rejects more than 64 panel nodes', () => {
    const nodes = Array.from({ length: 65 }, () => ({
      id: 'led:a',
      kind: 'led',
      x: 0,
      y: 0,
      w: 0.1,
      h: 0.1,
    }));
    expect(errorOf(withDef({ panel: { nodes } }))).toMatch(/at most 64/);
  });

  it('rejects two knobs attenuating the same input jack', () => {
    const knobs = [
      { id: 'a', label: 'A', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'cv' },
      { id: 'b', label: 'B', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'cv' },
    ];
    expect(errorOf(withDef({ knobs, panel: null }))).toMatch(/already attenuated/);
  });

  it('rejects a knob and a switch sharing an id', () => {
    const knobs = [{ id: 'mode', label: 'MODE', min: 0, max: 1, initial: 0, fmt: 'f1' }];
    const sws = [{ id: 'mode', label: 'MODE', options: ['A', 'B'] }];
    expect(errorOf(withDef({ knobs, sws, panel: null }))).toMatch(/one param namespace/);
  });

  it('rejects a knob whose range does not suit its fmt', () => {
    const knobs = [{ id: 'a', label: 'A', min: 0, max: 3, initial: 0, fmt: 'fPc' }];
    expect(errorOf(withDef({ knobs, panel: null }))).toMatch(/must stay within/);
  });

  it('rejects duplicate panel node ids', () => {
    const node = { id: 'knob:rate', kind: 'knob', x: 0, y: 0, w: 0.2, h: 0.2 };
    expect(errorOf(withDef({ panel: { nodes: [node, { ...node, y: 0.3 }] } }))).toMatch(
      /panel.nodes has a duplicate id "knob:rate"/,
    );
  });

  it('rejects a def the computed layout cannot fit and names the narrowest hp that can', () => {
    const many = (p: string): unknown[] =>
      Array.from({ length: 8 }, (_, i) => ({ id: `${p}${i}`, label: 'J', kind: 'a' }));
    const dense = { knobs: [], ins: many('i'), outs: many('o'), panel: null };
    const err = errorOf(withDef({ ...dense, hp: 1 }));
    expect(err).toMatch(/too narrow to lay this module out/);
    // The hp the message names is panel-layout's answer, not a constant restated here — so the
    // test asserts it is genuinely the narrowest rather than hard-coding the number.
    const need = Number(/use at least (\d+) HP/.exec(err)?.[1]);
    expect(need).toBeGreaterThan(1);
    expect(validateUserDef(withDef({ ...dense, hp: need })).ok).toBe(true);
    expect(validateUserDef(withDef({ ...dense, hp: need - 1 })).ok).toBe(false);
  });
});
