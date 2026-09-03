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
let Ctor: new () => Proc;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', SR);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./wavefold.dsp');
  Ctor = reg.mock.calls[0]?.[1] as new () => Proc;
});

/** Goertzel magnitude of `f` in `buf`. */
function mag(buf: Float32Array, f: number): number {
  const w = (2 * Math.PI * f) / SR;
  const c = 2 * Math.cos(w);
  let s1 = 0;
  let s2 = 0;
  for (let i = 0; i < buf.length; i++) {
    const s = (buf[i] ?? 0) + c * s1 - s2;
    s2 = s1;
    s1 = s;
  }
  return (2 * Math.hypot(s1 - s2 * Math.cos(w), s2 * Math.sin(w))) / buf.length;
}

/** Run a 500 Hz, 5 V sine through the folder at `fold`. */
function fold(f: number): Float32Array {
  const w = new Ctor();
  Object.assign(w.p, { fold: f, sym: 0, level: 0.8, mix: 1 });
  const n = 4800;
  const inp = new Float32Array(n);
  for (let i = 0; i < n; i++) inp[i] = 5 * Math.sin((2 * Math.PI * 500 * i) / SR);
  const out = new Float32Array(n);
  w.process([[inp], []], [[out]]);
  return out;
}

const peak = (b: Float32Array): number => b.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

/** Harmonic energy over fundamental energy — folding moves energy up the series. */
function harmonics(b: Float32Array): number {
  let sum = 0;
  for (const v of b) sum += v * v;
  const f0 = mag(b, 500);
  const fund = (f0 * f0) / 2;
  return Math.max(0, sum / b.length - fund) / Math.max(fund, 1e-9);
}

describe('wavefold.dsp', () => {
  it('passes the dry signal through untouched at MIX 0', () => {
    const w = new Ctor();
    Object.assign(w.p, { fold: 9, sym: 0.7, level: 1.2, mix: 0 });
    const n = 256;
    const inp = new Float32Array(n);
    for (let i = 0; i < n; i++) inp[i] = 5 * Math.sin(i * 0.11);
    const out = new Float32Array(n);
    w.process([[inp], []], [[out]]);
    let worst = 0;
    for (let i = 0; i < n; i++) worst = Math.max(worst, Math.abs((out[i] ?? 0) - (inp[i] ?? 0)));
    expect(worst).toBe(0);
  });

  it('gains harmonics as FOLD rises while the peak stays bounded', () => {
    const low = fold(1);
    const mid = fold(3);
    const high = fold(8);
    expect(harmonics(low)).toBeLessThan(harmonics(mid));
    expect(harmonics(mid)).toBeLessThan(harmonics(high));
    expect(harmonics(low)).toBeLessThan(0.01);
    expect(harmonics(high)).toBeGreaterThan(5);
    // A clipper would also bound the peak, but only by flattening; see the ramp test.
    const ceiling = 5 * 0.8 * 1.02;
    for (const b of [low, mid, high]) expect(peak(b)).toBeLessThan(ceiling);
    expect(peak(high)).toBeLessThan(peak(low) * 1.05);
  });

  it('folds rather than clips: a rising ramp turns back on itself', () => {
    const w = new Ctor();
    Object.assign(w.p, { fold: 6, sym: 0, level: 1, mix: 1 });
    const n = 2048;
    const inp = new Float32Array(n);
    for (let i = 0; i < n; i++) inp[i] = (i / (n - 1)) * 5;
    const out = new Float32Array(n);
    w.process([[inp], []], [[out]]);
    let turns = 0;
    let dir = 1;
    for (let i = 1; i < n; i++) {
      const d = (out[i] ?? 0) - (out[i - 1] ?? 0);
      if (Math.abs(d) < 1e-6) continue;
      const nd = d > 0 ? 1 : -1;
      if (nd !== dir) {
        turns++;
        dir = nd;
      }
    }
    // fold 6 over a 0..1 normalised ramp crosses three fold corners; a clipper gives 0.
    expect(turns).toBeGreaterThanOrEqual(2);
    expect(peak(out)).toBeLessThan(5.05);
  });
});
