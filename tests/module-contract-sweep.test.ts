import { describe, expect, it } from 'vitest';
import type { JackDef, ModuleDef } from '../src/core/types';
import { allSpecs } from '../src/modules/registry';

const specs = allSpecs();

function duplicateIds(jacks: JackDef[]): string[] {
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const j of jacks) {
    if (seen.has(j.id)) dupes.push(j.id);
    seen.add(j.id);
  }
  return dupes;
}

function checkDef(def: ModuleDef): void {
  // exactly one implementation route
  expect(Boolean(def.worklet) !== Boolean(def.native)).toBe(true);
  expect(duplicateIds(def.ins)).toEqual([]);
  expect(duplicateIds(def.outs)).toEqual([]);

  const ins = new Set(def.ins.map((j) => j.id));
  const cvIns = new Set(def.ins.filter((j) => j.kind === 'c').map((j) => j.id));
  for (const k of def.knobs) {
    expect(k.initial).toBeGreaterThanOrEqual(k.min);
    expect(k.initial).toBeLessThanOrEqual(k.max);
    if (k.cvIn !== undefined) expect(ins.has(k.cvIn)).toBe(true);
    if (k.attenuates !== undefined) expect(cvIns.has(k.attenuates)).toBe(true);
  }

  const leds = def.leds ?? [];
  expect(new Set(leds).size).toBe(leds.length);
  for (const id of leds) expect(id).toMatch(/^[a-z0-9_-]+$/);

  if (!def.panel) return;
  const controls = new Set<string>([
    ...def.knobs.flatMap((k) => [`knob:${k.id}`, `fader:${k.id}`]),
    ...(def.sws ?? []).map((s) => `switch:${s.id}`),
    ...def.ins.flatMap((j) => [`in:${j.id}`, `input:${j.id}`]),
    ...def.outs.flatMap((j) => [`out:${j.id}`, `output:${j.id}`]),
    ...leds.map((id) => `led:${id}`),
  ]);
  for (const node of def.panel.nodes) {
    if (/^(knob|fader|switch|led|in|out|input|output):/.test(node.id)) {
      expect(controls.has(node.id)).toBe(true);
    }
    for (const v of [node.x, node.y, node.w, node.h]) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  }
}

describe('module contract', () => {
  it('has unique module ids', () => {
    const ids = specs.map((s) => s.def.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const spec of specs) {
    it(`${spec.def.id} satisfies the def contract`, () => checkDef(spec.def));
  }
});

/** '../src/modules/lfo/lfo.dsp.ts' -> 'lfo'. Read at build time; vitest runs these through vite. */
const dspBySlug = new Map(
  Object.entries(
    import.meta.glob<string>('../src/modules/*/*.dsp.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }),
  ).map(([path, src]) => [path.split('/').at(-2) ?? '', src]),
);

describe('declared LEDs are driven', () => {
  for (const spec of specs.filter((s) => (s.def.leds ?? []).length > 0)) {
    it(`${spec.def.id} posts every LED it declares`, () => {
      const src = dspBySlug.get(spec.def.id) ?? '';
      expect(src, `${spec.def.id}: no ${spec.def.id}.dsp.ts to drive its LEDs`).not.toBe('');
      for (const led of spec.def.leds ?? []) {
        expect(
          new RegExp(`t:\\s*'led',\\s*id:\\s*'${led}'`).test(src),
          `${spec.def.id}.dsp.ts never posts { t: 'led', id: '${led}' } — the LED can never light`,
        ).toBe(true);
      }
    });
  }
});
