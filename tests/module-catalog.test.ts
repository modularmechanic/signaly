import { expect, test } from 'vitest';
import { FMT_RANGE } from '../src/core/types';
import { FMT, isIntFmt } from '../src/hooks/formatters';
import { allSpecs } from '../src/modules/registry';

// No frozen id list and no count: the registry glob IS the registration, so a 42nd module
// under src/modules/ is registered by existing, and nothing here may claim otherwise.
// Per-module well-formedness lives in module-contract-sweep.test.ts.
test('the catalog registers every module folder, with an implementation each', () => {
  const specs = allSpecs();
  expect(specs.length).toBeGreaterThan(0);
  for (const s of specs) {
    if (s.def.worklet) expect(s.def.worklet.length).toBeGreaterThan(0);
    else expect(s.native, `${s.def.id} declares no worklet, so it needs a native spec`).toBeDefined();
  }
});

// FMT_RANGE lives in core/types.ts; the label lists it describes live in hooks/formatters.ts,
// which checkDef cannot import. These four index a fixed list and go out of range in silence
// (fKey wraps, the rest clamp), so prove the bound is exactly that list: every value in range
// is a distinct label, and one past the top repeats one of them.
test('FMT_RANGE bounds the indexed formatters at their real label lists', () => {
  for (const name of ['fKey', 'fChord', 'fShape', 'fRate'] as const) {
    const [lo, hi] = FMT_RANGE[name] as readonly [number, number];
    expect(isIntFmt(name), `${name} indexes a list, so it must quantise while dragging`).toBe(true);
    expect(lo).toBe(0);
    const labels = Array.from({ length: hi - lo + 1 }, (_, i) => FMT[name](lo + i));
    expect(new Set(labels).size, `${name} [${lo},${hi}] repeats a label`).toBe(labels.length);
    expect(labels, `${name} max ${hi} is short of the last label`).toContain(FMT[name](hi + 1));
  }
});
