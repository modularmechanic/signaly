import { describe, expect, it } from 'vitest';
import { loadProcessor } from '../../../tests/dsp-harness';

/** Fire one trigger, then run 2 s; returns rising-edge sample indices for OUT and EOC. */
async function fire(p: Record<string, number>): Promise<{ out: number[]; eoc: number[] }> {
  const b = await loadProcessor('burst', p);
  const n = 128;
  const hi = new Float32Array(n).fill(5);
  const lo = new Float32Array(n);
  const O = Array.from({ length: 2 }, () => [new Float32Array(n)]);
  const out: number[] = [];
  const eoc: number[] = [];
  let po = 0;
  let pe = 0;
  for (let blk = 0; blk < 750; blk++) {
    b.process([[blk === 0 ? hi : lo], []], O);
    for (let i = 0; i < n; i++) {
      const o = O[0]?.[0]?.[i] ?? 0;
      const e = O[1]?.[0]?.[i] ?? 0;
      if (o > 2.5 && po <= 2.5) out.push(blk * n + i);
      if (e > 2.5 && pe <= 2.5) eoc.push(blk * n + i);
      po = o;
      pe = e;
    }
  }
  return { out, eoc };
}

const gaps = (edges: number[]): number[] => edges.slice(1).map((v, i) => v - (edges[i] ?? 0));

describe('burst.dsp', () => {
  it('emits exactly COUNT pulses per trigger, then one EOC', async () => {
    for (const count of [1, 4, 9]) {
      const { out, eoc } = await fire({ count, space: 0.05, curve: 0, ccvamt: 0 });
      expect([count, eoc.length]).toEqual([out.length, 1]);
    }
  });

  it('spaces the pulses evenly at CURVE 0', async () => {
    const g = gaps((await fire({ count: 6, space: 0.05, curve: 0, ccvamt: 0 })).out);
    expect(new Set(g).size).toBe(1);
    expect(g[0]).toBe(2400);
  });

  it('accelerates and decelerates the burst with CURVE', async () => {
    const up = gaps((await fire({ count: 6, space: 0.05, curve: 1, ccvamt: 0 })).out);
    expect(up[0]).toBe(2400);
    expect(up.at(-1)).toBeLessThan(200);
    expect(up.every((v, i) => i === 0 || v < (up[i - 1] ?? 0))).toBe(true);

    const down = gaps((await fire({ count: 5, space: 0.02, curve: -1, ccvamt: 0 })).out);
    expect(down.every((v, i) => i === 0 || v > (down[i - 1] ?? 0))).toBe(true);
  });

  it('scales COUNT from the CV input', async () => {
    const b = await loadProcessor('burst', { count: 2, space: 0.02, curve: 0, ccvamt: 0 });
    const n = 128;
    const hi = new Float32Array(n).fill(5);
    const lo = new Float32Array(n);
    const cv = new Float32Array(n).fill(2); // +2 V => +6 steps
    const O = Array.from({ length: 2 }, () => [new Float32Array(n)]);
    let prev = 0;
    let pulses = 0;
    for (let blk = 0; blk < 400; blk++) {
      b.process([[blk === 0 ? hi : lo], [cv]], O);
      for (let i = 0; i < n; i++) {
        const o = O[0]?.[0]?.[i] ?? 0;
        if (o > 2.5 && prev <= 2.5) pulses++;
        prev = o;
      }
    }
    expect(pulses).toBe(8);
  });
});
