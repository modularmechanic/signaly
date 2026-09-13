import { describe, expect, it } from 'vitest';
import { loadProcessor, SR } from '../../../tests/dsp-harness';

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

async function run(p: Record<string, number>, x: Float32Array, y: Float32Array): Promise<Float32Array> {
  const r = await loadProcessor('ring', p);
  const O = [[new Float32Array(N)]];
  r.process([[x], [y], []], O);
  return O[0]![0]!;
}

describe('ring.dsp', () => {
  it('makes sum and difference tones and suppresses both carriers', async () => {
    const out = await run({ depth: 1, offset: 0 }, sine(X_HZ), sine(Y_HZ));
    // 5sin(a) * sin(b) = 2.5[cos(a-b) - cos(a+b)]
    expect(bin(out, X_HZ - Y_HZ)).toBeCloseTo(2.5, 2);
    expect(bin(out, X_HZ + Y_HZ)).toBeCloseTo(2.5, 2);
    expect(bin(out, X_HZ)).toBeLessThan(0.01);
    expect(bin(out, Y_HZ)).toBeLessThan(0.01);
  });

  it('inverts X when Y goes negative — four quadrants, not two', async () => {
    const x = sine(X_HZ);
    const pos = await run({ depth: 1, offset: 0 }, x, new Float32Array(N).fill(5));
    const neg = await run({ depth: 1, offset: 0 }, x, new Float32Array(N).fill(-5));
    let worst = 0;
    for (let i = 0; i < N; i++) {
      worst = Math.max(worst, Math.abs(pos[i]! - x[i]!), Math.abs(neg[i]! + x[i]!));
    }
    expect(worst).toBeLessThan(1e-5);
  });

  it('keeps the X carrier when OFFSET biases toward AM', async () => {
    const out = await run({ depth: 1, offset: 0.5 }, sine(X_HZ), sine(Y_HZ));
    expect(bin(out, X_HZ)).toBeCloseTo(2.5, 2); // half the carrier survives
    expect(bin(out, X_HZ - Y_HZ)).toBeCloseTo(1.25, 2);
  });
});
