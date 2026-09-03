import { beforeAll, describe, expect, it, vi } from 'vitest';

class FakeProcessor {
  port = { onmessage: null, postMessage: (): void => {} };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
  p: Record<string, number>;
}
let Ring: new () => Proc;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', 48000);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./ring.dsp');
  Ring = reg.mock.calls[0]![1] as new () => Proc;
});

const SR = 48000;
const N = 4800; // whole periods of every frequency below, so no DFT leakage
const X_HZ = 1000;
const Y_HZ = 300;

const sine = (hz: number, amp = 5): Float32Array =>
  Float32Array.from({ length: N }, (_, i) => amp * Math.sin((2 * Math.PI * hz * i) / SR));

/** Amplitude of the `hz` component of `y` (single-bin DFT). */
function bin(y: Float32Array, hz: number): number {
  let re = 0,
    im = 0;
  for (let i = 0; i < N; i++) {
    const th = (2 * Math.PI * hz * i) / SR;
    re += y[i]! * Math.cos(th);
    im -= y[i]! * Math.sin(th);
  }
  return (2 * Math.hypot(re, im)) / N;
}

function run(p: Record<string, number>, x: Float32Array, y: Float32Array): Float32Array {
  const r = new Ring();
  Object.assign(r.p, p);
  const O = [[new Float32Array(N)]];
  r.process([[x], [y], []], O);
  return O[0]![0]!;
}

describe('ring.dsp', () => {
  it('makes sum and difference tones and suppresses both carriers', () => {
    const out = run({ depth: 1, offset: 0 }, sine(X_HZ), sine(Y_HZ));
    // 5sin(a) * sin(b) = 2.5[cos(a-b) - cos(a+b)]
    expect(bin(out, X_HZ - Y_HZ)).toBeCloseTo(2.5, 2);
    expect(bin(out, X_HZ + Y_HZ)).toBeCloseTo(2.5, 2);
    expect(bin(out, X_HZ)).toBeLessThan(0.01);
    expect(bin(out, Y_HZ)).toBeLessThan(0.01);
  });

  it('inverts X when Y goes negative — four quadrants, not two', () => {
    const x = sine(X_HZ);
    const pos = run({ depth: 1, offset: 0 }, x, new Float32Array(N).fill(5));
    const neg = run({ depth: 1, offset: 0 }, x, new Float32Array(N).fill(-5));
    let worst = 0;
    for (let i = 0; i < N; i++) {
      worst = Math.max(worst, Math.abs(pos[i]! - x[i]!), Math.abs(neg[i]! + x[i]!));
    }
    expect(worst).toBeLessThan(1e-5);
  });

  it('keeps the X carrier when OFFSET biases toward AM', () => {
    const out = run({ depth: 1, offset: 0.5 }, sine(X_HZ), sine(Y_HZ));
    expect(bin(out, X_HZ)).toBeCloseTo(2.5, 2); // half the carrier survives
    expect(bin(out, X_HZ - Y_HZ)).toBeCloseTo(1.25, 2);
  });
});
