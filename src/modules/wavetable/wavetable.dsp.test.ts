import { beforeAll, describe, expect, it, vi } from 'vitest';

class FakeProcessor {
  port: { onmessage: ((e: MessageEvent) => void) | null } = { onmessage: null };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
  p: Record<string, number>;
}
let WT: new () => Proc;

const SR = 48000;
const F = 100;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', SR);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./wavetable.dsp');
  WT = reg.mock.calls[0]![1] as new () => Proc;
});

/** Share of the output power that is NOT the 100 Hz fundamental — i.e. brightness. */
function brightness(pos: number): number {
  const w = new WT();
  w.p.pos = pos;
  const n = 9600;
  const vo = new Float32Array(n).fill(Math.log2(F / 261.626));
  const O = [[new Float32Array(n)]];
  w.process([[vo]], O);
  const y = O[0]![0]!;
  let re = 0,
    im = 0,
    tot = 0;
  const half = n / 2;
  for (let i = half; i < n; i++) {
    const s = y[i]!;
    const a = (2 * Math.PI * F * i) / SR;
    re += s * Math.cos(a);
    im += s * Math.sin(a);
    tot += s * s;
  }
  const power = tot / half;
  return (power - (2 * (re * re + im * im)) / (half * half)) / power;
}

describe('wavetable.dsp', () => {
  it('scans continuously: harmonic content rises monotonically across a table pair', () => {
    // pos 0..1/7 crossfades table 0 (sine, no harmonics) into table 1 (triangle).
    const steps = [0, 0.25, 0.5, 0.75, 1].map((f) => brightness(f / 7));
    for (let i = 1; i < steps.length; i++) expect(steps[i]!).toBeGreaterThan(steps[i - 1]!);
    expect(steps[0]!).toBeLessThan(0.001);
    expect(steps[4]!).toBeGreaterThan(20 * steps[0]!);
  });

  it('gets brighter still at the top of the bank and stays inside +-5 V', () => {
    expect(brightness(1)).toBeGreaterThan(brightness(3 / 7));
    const w = new WT();
    w.p.pos = 1;
    const O = [[new Float32Array(2048)]];
    w.process([[new Float32Array(2048)]], O);
    for (const s of O[0]![0]!) expect(Math.abs(s)).toBeLessThanOrEqual(5);
  });
});
