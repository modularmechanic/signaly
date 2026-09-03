import { beforeAll, describe, expect, it, vi } from 'vitest';

class FakeProcessor {
  port = { onmessage: null, postMessage: (): void => {} };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
  p: Record<string, number>;
}
let RndWalk: new () => Proc;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', 48000);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./rndwalk.dsp');
  RndWalk = reg.mock.calls[0]![1] as new () => Proc;
});

describe('rndwalk.dsp', () => {
  it('stays inside ±RANGE over 10 000 clocks', () => {
    const w = new RndWalk();
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
