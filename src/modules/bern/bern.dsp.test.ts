import { beforeAll, describe, expect, it, vi } from 'vitest';

class FakeProcessor {
  port = { onmessage: null, postMessage: (): void => {} };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
  p: Record<string, number>;
}
let Bern: new () => Proc;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', 48000);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./bern.dsp');
  Bern = reg.mock.calls[0]![1] as new () => Proc;
});

/** Fires `pulses` gate pulses and counts how many landed on A vs B. */
function runBias(bias: number, pulses: number): { a: number; b: number } {
  const c = new Bern();
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
  it('never fires B at bias 0 and never fires A at bias 1', () => {
    const zero = runBias(0, 40);
    expect(zero.b).toBe(0);
    expect(zero.a).toBe(40);

    const one = runBias(1, 40);
    expect(one.a).toBe(0);
    expect(one.b).toBe(40);
  });
});
