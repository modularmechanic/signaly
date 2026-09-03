import { describe, expect, it, vi } from 'vitest';
import type { ModuleInstance } from '../../engine/types';
import { def } from './seq.def';
import { getSeq, serialize, STEPS, type SeqExt } from './seq.serialize';

function instance(): { m: ModuleInstance; post: ReturnType<typeof vi.fn> } {
  const post = vi.fn();
  const m = {
    uid: 1,
    def,
    node: { port: { postMessage: post } },
    jacks: { in: {}, out: {} },
    vals: {},
    sws: {},
    ext: {},
  } as unknown as ModuleInstance;
  return { m, post };
}

const pattern = (steps: SeqExt['steps']): SeqExt => ({ steps });

describe('seq.serialize', () => {
  it('seeds a default 8-step pattern and round-trips it', () => {
    const { m } = instance();
    const saved = serialize.save(m) as SeqExt;
    expect(saved.steps).toHaveLength(STEPS);
    expect(serialize.validate?.(saved)).toBe(true);

    const { m: other, post } = instance();
    serialize.load(other, saved);
    expect(serialize.save(other)).toEqual(saved);
    expect(post).toHaveBeenCalledWith({
      t: 'steps',
      v: saved.steps.map((s) => s.pitch),
      g: saved.steps.map((s) => s.gate),
    });
  });

  it('loads an edited pattern and pushes it to the worklet', () => {
    const { m, post } = instance();
    const edited = pattern(
      Array.from({ length: STEPS }, (_, i) => ({ pitch: i - 4, gate: (i % 2) as 0 | 1 })),
    );
    serialize.load(m, edited);
    expect(getSeq(m).steps[0]).toEqual({ pitch: -4, gate: 0 });
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed blobs without throwing or writing ext', () => {
    const short = pattern(Array.from({ length: 4 }, () => ({ pitch: 0, gate: 1 as const })));
    const nan = pattern(Array.from({ length: STEPS }, () => ({ pitch: Number.NaN, gate: 1 as const })));
    const badGate = { steps: Array.from({ length: STEPS }, () => ({ pitch: 0, gate: 2 })) };
    for (const bad of [short, nan, badGate, null, undefined, 'steps', { steps: {} }, { steps: [null] }]) {
      expect(serialize.validate?.(bad)).toBe(false);
      const { m, post } = instance();
      serialize.load(m, bad);
      expect(m.ext.seq).toBeUndefined();
      expect(post).not.toHaveBeenCalled();
    }
  });
});
