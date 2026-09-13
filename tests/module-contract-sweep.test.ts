import { describe, expect, it } from 'vitest';
import { checkDef } from '../src/features/user-modules/check-def';
import { allSpecs } from '../src/modules/registry';

const specs = allSpecs();

describe('module contract', () => {
  it('has unique module ids', () => {
    const ids = specs.map((s) => s.def.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const spec of specs) {
    it(`${spec.def.id} satisfies the def contract`, () => {
      // The one rule a user module cannot have an opinion on: exactly one implementation route.
      expect(Boolean(spec.def.worklet) !== Boolean(spec.def.native)).toBe(true);
      // Everything else is the same checker the user-module path runs.
      expect(checkDef(spec.def)).toBeNull();
    });
  }
});

// The static half of the display contract rides on checkDef above. What checkDef cannot see is
// the spec: whether a `.parts.tsx` exists to take the display slot.
describe('display slot', () => {
  for (const { def, parts } of specs.filter((s) => s.parts || s.def.screen)) {
    it(`${def.id} reserves its screen for its parts component`, () => {
      expect(
        parts,
        `${def.id}: screen reserves a box only ${def.id}.parts.tsx can fill, and there is none`,
      ).toBeTruthy();
      expect(
        def.display,
        `${def.id}: ${def.id}.parts.tsx replaces the display node, so display '${def.display}' can never render — declare screen: true instead`,
      ).toBeUndefined();
      expect(
        def.screen,
        `${def.id}: ${def.id}.parts.tsx needs a screen node to draw into — declare screen: true`,
      ).toBe(true);
    });
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
