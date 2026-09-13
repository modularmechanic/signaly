import { describe, expect, it } from 'vitest';
import { loadProcessor } from '../../../tests/dsp-harness';

/** Counts rising edges on output `k` across `periods` clocks of `period` samples each. */
async function countEdges(k: number, periods: number, period: number): Promise<number> {
  const d = await loadProcessor('divmult');
  const O = Array.from({ length: 6 }, () => [new Float32Array(period)]);
  let edges = 0;
  let last = 0;
  for (let p = 0; p < periods; p++) {
    const clk = new Float32Array(period);
    clk.fill(5, 0, Math.max(1, period / 2));
    d.process([[clk], []], O);
    for (let i = 0; i < period; i++) {
      const v = O[k]![0]![i] ?? 0;
      if (v > 2.5 && last <= 2.5) edges++;
      last = v;
    }
  }
  return edges;
}

describe('divmult.dsp', () => {
  it('divides: ÷8 ÷4 ÷2 fire once every 8, 4 and 2 clocks', async () => {
    // Counters start at 0, so the first clock fires every divider; 16 clocks give 2, 4, 8.
    expect(await countEdges(0, 16, 500)).toBe(2);
    expect(await countEdges(1, 16, 500)).toBe(4);
    expect(await countEdges(2, 16, 500)).toBe(8);
  });

  it.each([
    [3, 2],
    [4, 3],
    [5, 4],
  ])('output %i fires ×%i per clock once the period has locked on', async (k, n) => {
    const period = 1000;
    // Skip the first 2 periods: no period estimate exists until the 2nd clock edge, so
    // only the edge-aligned pulse fires before that. From the 3rd period on, at a steady
    // input, ×N must land exactly N pulses per period.
    const warmup = await countEdges(k, 2, period);
    expect(warmup).toBeGreaterThanOrEqual(1);
    expect((await countEdges(k, 8, period)) - warmup).toBe(6 * n);
  });
});
