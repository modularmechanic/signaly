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
      // A module may post each id as a literal, or index a table of ids (the DRY form once a
      // module has eight LEDs). Accept the table only when the file really does post an LED
      // with a computed id, so "the id appears in a comment" still fails.
      // Matches `id: LED_IDS[b]` and the `{ t: 'led', id, v }` shorthand, but not `id: 'b1'`.
      const postsComputedId = /t:\s*'led',\s*id(?!\s*:\s*')/.test(src);
      for (const led of spec.def.leds ?? []) {
        const literal = new RegExp(`t:\\s*'led',\\s*id:\\s*'${led}'`).test(src);
        const inTable = postsComputedId && new RegExp(`'${led}'`).test(src);
        expect(
          literal || inTable,
          `${spec.def.id}.dsp.ts never posts { t: 'led', id: '${led}' } — the LED can never light`,
        ).toBe(true);
      }
    });
  }
});

/** A jack is a promise: a cable into it does something. A declared jack the DSP never touches
    still renders, still accepts a patch, and then silently does nothing — the worst kind of bug
    to find by ear. This sweep reads each processor's source and checks that every declared
    input index is read and every declared output index is written, and that neither runs past
    what the def declares (the node is built with exactly `ins.length` / `outs.length` ports, so
    an over-range access can never be reached). */
describe('declared jacks are wired', () => {
  /** `process(I, O)` names its own parameters; find them rather than assuming. */
  const signature = (src: string): [string, string] | null => {
    const m = /process\(\s*(\w+)\s*:[^,]+,\s*(\w+)\s*:/.exec(src);
    return m?.[1] && m[2] ? [m[1], m[2]] : null;
  };
  const indices = (src: string, re: RegExp): Set<number> => {
    const out = new Set<number>();
    for (const m of src.matchAll(re)) if (m[1]) out.add(Number(m[1]));
    return out;
  };

  for (const spec of specs.filter((s) => s.def.worklet)) {
    it(`${spec.def.id} reads every input and writes every output it declares`, () => {
      const { id, ins, outs } = spec.def;
      const src = dspBySlug.get(id) ?? '';
      expect(src, `${id}: no ${id}.dsp.ts`).not.toBe('');
      const sig = signature(src);
      expect(sig, `${id}.dsp.ts: could not read the process() signature`).not.toBeNull();
      const [I, O] = sig!;
      const read = indices(src, new RegExp(`ch\\(${I},\\s*(\\d+)\\)`, 'g'));
      for (const n of indices(src, new RegExp(`(?<![A-Za-z0-9_])${I}\\[(\\d+)\\]`, 'g'))) read.add(n);
      const written = indices(src, new RegExp(`(?<![A-Za-z0-9_])${O}\\[(\\d+)\\]`, 'g'));

      // A module that indexes its jacks through a variable is covered by its own tests; only
      // its out-of-range access is visible from here.
      const dynamic =
        new RegExp(`ch\\(${I},\\s*[A-Za-z_]`).test(src) ||
        new RegExp(`(?<![A-Za-z0-9_])[${I}${O}]\\[[A-Za-z_]`).test(src);

      for (const n of read)
        expect(n, `${id}.dsp.ts reads input #${n}, but the def declares ${ins.length}`).toBeLessThan(
          ins.length,
        );
      for (const n of written)
        expect(n, `${id}.dsp.ts writes output #${n}, but the def declares ${outs.length}`).toBeLessThan(
          outs.length,
        );
      if (dynamic) return;
      ins.forEach((j, i) =>
        expect(read.has(i), `${id}: input '${j.id}' is declared but ${id}.dsp.ts never reads it`).toBe(true),
      );
      outs.forEach((j, i) =>
        expect(written.has(i), `${id}: output '${j.id}' is declared but ${id}.dsp.ts never writes it`).toBe(
          true,
        ),
      );
    });
  }
});
