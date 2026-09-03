import { beforeAll, describe, expect, it, vi } from 'vitest';

class FakeProcessor {
  port = { onmessage: null as ((e: MessageEvent) => void) | null, postMessage: vi.fn() };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
}
type Ctor = new (o?: { processorOptions?: { p?: Record<string, number> } }) => Proc;

let Burst: Ctor;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', 48000);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./burst.dsp');
  Burst = reg.mock.calls[0]![1] as Ctor;
});

/** Fire one trigger, then run 2 s; returns rising-edge sample indices for OUT and EOC. */
function fire(p: Record<string, number>): { out: number[]; eoc: number[] } {
  const b = new Burst({ processorOptions: { p } });
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
  it('emits exactly COUNT pulses per trigger, then one EOC', () => {
    for (const count of [1, 4, 9]) {
      const { out, eoc } = fire({ count, space: 0.05, curve: 0, ccvamt: 0 });
      expect([count, eoc.length]).toEqual([out.length, 1]);
    }
  });

  it('spaces the pulses evenly at CURVE 0', () => {
    const g = gaps(fire({ count: 6, space: 0.05, curve: 0, ccvamt: 0 }).out);
    expect(new Set(g).size).toBe(1);
    expect(g[0]).toBe(2400);
  });

  it('accelerates and decelerates the burst with CURVE', () => {
    const up = gaps(fire({ count: 6, space: 0.05, curve: 1, ccvamt: 0 }).out);
    expect(up[0]).toBe(2400);
    expect(up.at(-1)).toBeLessThan(200);
    expect(up.every((v, i) => i === 0 || v < (up[i - 1] ?? 0))).toBe(true);

    const down = gaps(fire({ count: 5, space: 0.02, curve: -1, ccvamt: 0 }).out);
    expect(down.every((v, i) => i === 0 || v > (down[i - 1] ?? 0))).toBe(true);
  });

  it('scales COUNT from the CV input', () => {
    const b = new Burst({ processorOptions: { p: { count: 2, space: 0.02, curve: 0, ccvamt: 0 } } });
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
