import { describe, expect, it } from 'vitest';
import type { Proc } from '../../../tests/dsp-harness';
import { loadProcessor } from '../../../tests/dsp-harness';

const N = 48000;

/** X output for a Lorenz run started at `x0`. */
async function run(x0: number): Promise<Float32Array> {
  const c = (await loadProcessor('chaos')) as Proc & { x: number };
  c.x = x0;
  const O = [[new Float32Array(N)], [new Float32Array(N)], [new Float32Array(N)]];
  c.process([[]], O);
  return O[0]![0]!;
}

describe('chaos.dsp', () => {
  it('repeats exactly from the same state and diverges from a state 1e-6 away', async () => {
    const a = await run(0.1);
    const b = await run(0.1);
    const c = await run(0.1 + 1e-6);
    let same = 0,
      apart = 0;
    for (let i = 0; i < N; i++) {
      same = Math.max(same, Math.abs(a[i]! - b[i]!));
      apart = Math.max(apart, Math.abs(a[i]! - c[i]!));
    }
    expect(same).toBe(0);
    expect(apart).toBeGreaterThan(1);
  });

  it('stays on the attractor: bounded, non-constant, inside +-5 V', async () => {
    const y = await run(0.1);
    let lo = Infinity,
      hi = -Infinity;
    for (let i = N / 2; i < N; i++) {
      lo = Math.min(lo, y[i]!);
      hi = Math.max(hi, y[i]!);
    }
    expect(hi - lo).toBeGreaterThan(1);
    expect(hi).toBeLessThanOrEqual(5);
    expect(lo).toBeGreaterThanOrEqual(-5);
  });
});
