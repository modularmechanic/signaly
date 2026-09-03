import { beforeAll, describe, expect, it, vi } from 'vitest';

class FakeProcessor {
  port = { onmessage: null, postMessage: (): void => {} };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
  p: Record<string, number>;
}
let Logic: new () => Proc;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', 48000);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./logic.dsp');
  Logic = reg.mock.calls[0]![1] as new () => Proc;
});

/** [AND, OR, XOR, NOT A] in volts for a pair of held input voltages. */
function row(av: number, bv: number, thr = 2.5): number[] {
  const l = new Logic();
  l.p.thr = thr;
  const n = 8;
  const O = [0, 1, 2, 3].map(() => [new Float32Array(n)]);
  l.process([[new Float32Array(n).fill(av)], [new Float32Array(n).fill(bv)]], O);
  return O.map((o) => o[0]![n - 1]!);
}

describe('logic.dsp', () => {
  it('produces the truth table from real gate voltages', () => {
    expect([row(0, 0), row(0, 5), row(5, 0), row(5, 5)]).toEqual([
      [0, 0, 0, 5],
      [0, 5, 5, 5],
      [0, 5, 5, 0],
      [5, 5, 0, 0],
    ]);
  });

  it('decides high and low at THRESHOLD, not at a fixed voltage', () => {
    // the same 2 V input is high under a 1 V threshold and low under a 3 V one
    expect([row(2, 0, 1), row(2, 0, 3)]).toEqual([
      [0, 5, 5, 0],
      [0, 0, 0, 5],
    ]);
  });
});
