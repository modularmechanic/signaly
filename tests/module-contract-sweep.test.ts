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
      for (const led of spec.def.leds ?? []) {
        expect(
          new RegExp(`t:\\s*'led',\\s*id:\\s*'${led}'`).test(src),
          `${spec.def.id}.dsp.ts never posts { t: 'led', id: '${led}' } — the LED can never light`,
        ).toBe(true);
      }
    });
  }
});
