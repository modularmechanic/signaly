import { describe, expect, it } from 'vitest';
import { loadProcessor } from '../../../tests/dsp-harness';

describe('rndwalk.dsp', () => {
  it('stays inside ±RANGE over 10 000 clocks', async () => {
    const w = await loadProcessor('rndwalk');
    w.p.step = 0.5;
    w.p.range = 5;
    const O = [[new Float32Array(4)]];
    const hi = new Float32Array(4).fill(5);
    const lo = new Float32Array(4);
    let max = 0;
    let moved = false;
    let prev = 0;
    for (let n = 0; n < 10000; n++) {
      w.process([[hi], []], O);
      const v = O[0]![0]![3] ?? 0;
      if (Math.abs(v) > max) max = Math.abs(v);
      if (v !== prev) moved = true;
      prev = v;
      w.process([[lo], []], O);
    }
    expect(max).toBeLessThanOrEqual(5);
    expect(moved).toBe(true);
  });
});
