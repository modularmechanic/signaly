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
    expect(k.def).toBeGreaterThanOrEqual(k.min);
    expect(k.def).toBeLessThanOrEqual(k.max);
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
