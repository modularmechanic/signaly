import { describe, expect, it } from 'vitest';
import { loadProcessor } from '../../../tests/dsp-harness';

/** Fires `pulses` gate pulses and counts how many landed on A vs B. */
async function runBias(bias: number, pulses: number): Promise<{ a: number; b: number }> {
  const c = await loadProcessor('bern');
  c.p.bias = bias;
  const hi = new Float32Array(4).fill(5);
  const lo = new Float32Array(4);
  const O = [[new Float32Array(4)], [new Float32Array(4)]];
  let a = 0;
  let b = 0;
  for (let n = 0; n < pulses; n++) {
    c.process([[hi], []], O);
    if ((O[0]?.[0]?.[3] ?? 0) > 2.5) a++;
    if ((O[1]?.[0]?.[3] ?? 0) > 2.5) b++;
    c.process([[lo], []], O);
  }
  return { a, b };
}

describe('bern.dsp', () => {
  it('never fires B at bias 0 and never fires A at bias 1', async () => {
    const zero = await runBias(0, 40);
    expect(zero.b).toBe(0);
    expect(zero.a).toBe(40);

    const one = await runBias(1, 40);
    expect(one.a).toBe(0);
    expect(one.b).toBe(40);
  });
});
