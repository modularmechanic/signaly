import { beforeAll, describe, expect, it, vi } from 'vitest';

class FakeProcessor {
  port: { onmessage: ((e: MessageEvent) => void) | null } = { onmessage: null };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
  p: Record<string, number>;
}
let Shimmer: new () => Proc;

const SR = 48000;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', SR);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./shimmer.dsp');
  Shimmer = reg.mock.calls[0]![1] as new () => Proc;
});

/** Single-frequency correlation energy (a one-bin DFT) over [start,end). */
function toneEnergy(y: Float32Array, start: number, end: number, freq: number, sr: number): number {
  let re = 0,
    im = 0;
  for (let i = start; i < end; i++) {
    const ph = (2 * Math.PI * freq * i) / sr;
    re += y[i]! * Math.cos(ph);
    im += y[i]! * Math.sin(ph);
  }
  return Math.sqrt(re * re + im * im) / (end - start);
}

/** Run a 220 Hz burst through SHIMMER, return L for a run whose FEEDBACK is `fb`. */
function run(fb: number): { L: Float32Array; burst: number } {
  const s = new Shimmer();
  s.p.fb = fb;
  s.p.mix = 1;
  s.p.window = 0.02;
  s.p.damp = 3000;
  const burst = Math.round(SR * 0.15);
  const total = Math.round(SR * 0.35);
  const inp = new Float32Array(total);
  for (let i = 0; i < burst; i++) inp[i] = Math.sin((2 * Math.PI * 220 * i) / SR) * 3;
  const O = [[new Float32Array(total)], [new Float32Array(total)]];
  s.process([[inp]], O);
  return { L: O[0]![0]!, burst };
}

describe('shimmer.dsp', () => {
  it('passes fully dry input through unchanged', () => {
    const s = new Shimmer();
    s.p.mix = 0;
    s.p.fb = 0.9;
    const n = 512;
    const inp = new Float32Array(n);
    for (let i = 0; i < n; i++) inp[i] = Math.sin((2 * Math.PI * 220 * i) / SR) * 3;
    const O = [[new Float32Array(n)], [new Float32Array(n)]];
    s.process([[inp]], O);
    expect(Array.from(O[0]![0]!)).toEqual(Array.from(inp));
  });

  it('sustains octave-shifted content after the burst ends, with nothing left once feedback is off', () => {
    const { L, burst } = run(0.75);
    // clear of the 20ms window's own reach into the burst, and short of full decay
    const ts = burst + Math.round(SR * 0.03);
    const te = burst + Math.round(SR * 0.12);
    const e220 = toneEnergy(L, ts, te, 220, SR);
    const upper =
      toneEnergy(L, ts, te, 440, SR) + toneEnergy(L, ts, te, 660, SR) + toneEnergy(L, ts, te, 880, SR);
    expect(upper).toBeGreaterThan(e220 * 2);

    const off = run(0);
    const e220Off = toneEnergy(off.L, ts, te, 220, SR);
    expect(e220Off).toBe(0);
  });
});
