import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Params } from '../../engine/dsp-prelude';

const SR = 48000;

class FakeProcessor {
  port = { onmessage: null as ((e: MessageEvent) => void) | null, postMessage: vi.fn() };
}

interface Proc {
  p: Params;
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
}
let Polivoks: new () => Proc;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', SR);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./polivoks.dsp');
  Polivoks = reg.mock.calls[0]?.[1] as new () => Proc;
});

/** Filter a `hz` sine of amplitude `amp` V at a wide-open cutoff, with the given drive. */
function run(hz: number, drive: number, amp: number): Float32Array {
  const f = new Polivoks();
  Object.assign(f.p, { cut: 8000, res: 0.2, drive, cvA: 0 });
  const n = 9600;
  const inp = new Float32Array(n);
  for (let i = 0; i < n; i++) inp[i] = Math.sin((2 * Math.PI * hz * i) / SR) * amp;
  const out = new Float32Array(n);
  f.process([[inp]], [[out]]);
  return out;
}

/** Amplitude of the `hz` component over the second half of `y`. */
function bin(y: Float32Array, hz: number): number {
  let re = 0,
    im = 0;
  const half = y.length / 2;
  for (let i = half; i < y.length; i++) {
    const a = (2 * Math.PI * hz * i) / SR;
    re += y[i]! * Math.cos(a);
    im += y[i]! * Math.sin(a);
  }
  return (2 * Math.sqrt(re * re + im * im)) / half;
}

describe('polivoks.dsp', () => {
  it('driving the integrators into clipping adds harmonics the clean signal lacks', () => {
    const clean = run(200, 0.3, 1);
    const hot = run(200, 8, 4);
    const thirdRatio = (y: Float32Array): number => bin(y, 600) / Math.max(1e-9, bin(y, 200));
    expect(thirdRatio(clean)).toBeLessThan(0.001);
    expect(thirdRatio(hot)).toBeGreaterThan(0.1);
  });

  it('stays finite and clamped at maximum drive and resonance', () => {
    const out = run(200, 10, 5);
    let peak = 0;
    let allFinite = true;
    for (const s of out) {
      if (!Number.isFinite(s)) allFinite = false;
      peak = Math.max(peak, Math.abs(s));
    }
    expect(allFinite).toBe(true);
    expect(peak).toBeLessThanOrEqual(5.0001);
  });
});
