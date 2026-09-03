import { beforeAll, describe, expect, it, vi } from 'vitest';

class FakeProcessor {
  port = { onmessage: null, postMessage: (): void => {} };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
}
let DivMult: new () => Proc;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', 48000);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./divmult.dsp');
  DivMult = reg.mock.calls[0]![1] as new () => Proc;
});

/** Counts ×2 (output index 3) rising edges across `periods` clocks of `period` samples each. */
function countM2Edges(periods: number, period: number): number {
  const d = new DivMult();
  const O = Array.from({ length: 6 }, () => [new Float32Array(period)]);
  let edges = 0;
  let last = 0;
  for (let p = 0; p < periods; p++) {
    const clk = new Float32Array(period);
    clk.fill(5, 0, Math.max(1, period / 2));
    d.process([[clk], []], O);
    for (let i = 0; i < period; i++) {
      const v = O[3]![0]![i] ?? 0;
      if (v > 2.5 && last <= 2.5) edges++;
      last = v;
    }
  }
  return edges;
}

describe('divmult.dsp', () => {
  it('fires ×2 twice per clock once the period has locked on', () => {
    const period = 1000;
    // Skip the first 2 periods: no period estimate exists until the 2nd clock edge, so
    // only the edge-aligned pulse fires before that. From the 3rd period on, at a steady
    // input, ×2 must land exactly 2 pulses per period.
    const warmup = countM2Edges(2, period);
    expect(warmup).toBeGreaterThanOrEqual(1);
    const steadyEdges = countM2Edges(8, period) - warmup;
    expect(steadyEdges).toBe(12); // 6 steady periods * 2 pulses
  });
});
