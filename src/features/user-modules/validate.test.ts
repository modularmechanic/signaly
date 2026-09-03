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
    { id: 'amt', label: 'AMOUNT', min: -1, max: 1, initial: 0, cvIn: 'cv', attenuates: 'cv' },
  ],
  sws: [{ id: 'wave', label: 'WAVE', options: ['SIN', 'TRI', 'SAW'], initial: 1 }],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'cv', label: 'CV', kind: 'c' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
  display: 'scope',
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
    expect(r.def.display).toBe('scope');
  });

  it('treats null as absent for optional fields', () => {
    const r = validateUserDef(withDef({ display: null, sws: null, panel: null, dark: null }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.def.display).toBeUndefined();
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
    }));
    expect(errorOf(withDef({ knobs }))).toMatch(/at most 16/);
  });

  it('rejects a knob default outside [min,max]', () => {
    expect(errorOf(withDef({ knobs: [{ id: 'a', label: 'A', min: 0, max: 1, initial: 2 }] }))).toMatch(
      /within/,
    );
  });

  it('rejects attenuates naming a non-CV input', () => {
    const knobs = [{ id: 'a', label: 'A', min: 0, max: 1, initial: 0, attenuates: 'in' }];
    expect(errorOf(withDef({ knobs }))).toMatch(/must name a 'c' input/);
  });

  it('rejects cvIn naming no input', () => {
    const knobs = [{ id: 'a', label: 'A', min: 0, max: 1, initial: 0, cvIn: 'nope' }];
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
      { id: 'a', label: 'A', min: -1, max: 1, initial: 0, attenuates: 'cv' },
      { id: 'b', label: 'B', min: -1, max: 1, initial: 0, attenuates: 'cv' },
    ];
    expect(errorOf(withDef({ knobs, panel: null }))).toMatch(/already attenuated/);
  });

  it('rejects duplicate panel node ids', () => {
    const node = { id: 'knob:rate', kind: 'knob', x: 0, y: 0, w: 0.2, h: 0.2 };
    expect(errorOf(withDef({ panel: { nodes: [node, { ...node, y: 0.3 }] } }))).toMatch(
      /panel.nodes has a duplicate id "knob:rate"/,
    );
  });

  it('rejects a jack count that cannot fit the declared hp', () => {
    const many = (p: string): unknown[] =>
      Array.from({ length: 8 }, (_, i) => ({ id: `${p}${i}`, label: 'J', kind: 'a' }));
    const dense = { knobs: [], ins: many('i'), outs: many('o'), panel: null };
    expect(errorOf(withDef({ ...dense, hp: 1 }))).toMatch(/too narrow for 8 in and 8 out jacks/);
    expect(errorOf(withDef({ ...dense, hp: 1 }))).toMatch(/use at least 4 HP/);
    expect(validateUserDef(withDef({ ...dense, hp: 4 })).ok).toBe(true);
  });
});
