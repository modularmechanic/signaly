import { describe, expect, it } from 'vitest';
import { loadProcessor } from '../../../tests/dsp-harness';

/** [AND, OR, XOR, NOT A] in volts for a pair of held input voltages. */
async function row(av: number, bv: number, thr = 2.5): Promise<number[]> {
  const l = await loadProcessor('logic');
  l.p.thr = thr;
  const n = 8;
  const O = [0, 1, 2, 3].map(() => [new Float32Array(n)]);
  l.process([[new Float32Array(n).fill(av)], [new Float32Array(n).fill(bv)]], O);
  return O.map((o) => o[0]![n - 1]!);
}

describe('logic.dsp', () => {
  it('produces the truth table from real gate voltages', async () => {
    expect([await row(0, 0), await row(0, 5), await row(5, 0), await row(5, 5)]).toEqual([
      [0, 0, 0, 5],
      [0, 5, 5, 5],
      [0, 5, 5, 0],
      [5, 5, 0, 0],
    ]);
  });

  it('decides high and low at THRESHOLD, not at a fixed voltage', async () => {
    // the same 2 V input is high under a 1 V threshold and low under a 3 V one
    expect([await row(2, 0, 1), await row(2, 0, 3)]).toEqual([
      [0, 5, 5, 0],
      [0, 0, 0, 5],
    ]);
  });
});
