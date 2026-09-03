import { beforeAll, describe, expect, it, vi } from 'vitest';

class FakeProcessor {
  port = { onmessage: null, postMessage: (): void => {} };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
  p: Record<string, number>;
}
let Shift: new () => Proc;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', 48000);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./shift.dsp');
  Shift = reg.mock.calls[0]![1] as new () => Proc;
});

describe('shift.dsp', () => {
  it("holds OUT 4 at OUT 1's value from three clocks earlier", () => {
    const s = new Shift();
    s.p.slew = 0.0005; // effectively instant at 48kHz — a clean sample & hold
    const O = [
      [new Float32Array(64)],
      [new Float32Array(64)],
      [new Float32Array(64)],
      [new Float32Array(64)],
    ];
    const o1: number[] = [];
    const o4: number[] = [];
    for (let step = 0; step < 8; step++) {
      const hi = new Float32Array(64).fill(5);
      const inp = new Float32Array(64).fill(step + 1);
      s.process([[inp], [hi]], O);
      // read well after the edge so the one-pole has fully settled
      o1.push(O[0]![0]![63] ?? 0);
      o4.push(O[3]![0]![63] ?? 0);
      const lo = new Float32Array(64);
      s.process([[inp], [lo]], O);
    }
    for (let k = 3; k < 8; k++) {
      expect(o4[k]).toBeCloseTo(o1[k - 3]!, 3);
    }
  });
});
