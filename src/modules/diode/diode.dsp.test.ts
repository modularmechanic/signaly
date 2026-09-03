import { beforeAll, describe, expect, it, vi } from 'vitest';

class FakeProcessor {
  port: { onmessage: ((e: MessageEvent) => void) | null } = { onmessage: null };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
  p: Record<string, number>;
}
let Diode: new () => Proc;

const SR = 48000;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', SR);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./diode.dsp');
  Diode = reg.mock.calls[0]![1] as new () => Proc;
});

/** Filter a `hz` sine of amplitude `amp` V at the given cutoff and drive. */
function run(hz: number, cut: number, drive: number, amp = 4): Float32Array {
  const f = new Diode();
  f.p.cut = cut;
  f.p.drive = drive;
  f.p.res = 0;
  const n = 9600;
  const inp = new Float32Array(n);
  for (let i = 0; i < n; i++) inp[i] = Math.sin((2 * Math.PI * hz * i) / SR) * amp;
  const O = [[new Float32Array(n)]];
  f.process([[inp]], O);
  return O[0]![0]!;
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

describe('diode.dsp', () => {
  it('attenuates a tone far above cutoff', () => {
    const open = bin(run(2000, 12000, 1), 2000);
    const closed = bin(run(2000, 150, 1), 2000);
    expect(open).toBeGreaterThan(1);
    expect(closed).toBeLessThan(open * 0.1);
  });

  it('drive adds harmonics the clean path does not have', () => {
    const clean = run(200, 15000, 0.3, 1);
    const hot = run(200, 15000, 8, 4);
    const ratio = (y: Float32Array): number => (bin(y, 400) + bin(y, 600)) / Math.max(1e-9, bin(y, 200));
    expect(ratio(clean)).toBeLessThan(0.02);
    expect(ratio(hot)).toBeGreaterThan(0.1);
    // asymmetry means the even harmonic is there too, not just the odd one
    expect(bin(hot, 400)).toBeGreaterThan(bin(clean, 400) * 10);
  });
});
