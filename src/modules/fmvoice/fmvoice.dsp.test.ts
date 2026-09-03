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
  await import('./fmvoice.dsp');
  Ctor = reg.mock.calls[0]?.[1] as new () => Proc;
});

/** Goertzel magnitude of `f` Hz within one block of `buf`. */
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

const rms = (b: Float32Array): number => Math.sqrt(b.reduce((s, v) => s + v * v, 0) / b.length);

/** Mean-square energy in `buf` left unexplained by pure tones at `freqs` — near 0 for a simple
    additive mix of those tones, well above 0 once FM sidebands spread energy elsewhere. */
function residual(buf: Float32Array, freqs: number[]): number {
  let total = 0;
  for (const v of buf) total += v * v;
  total /= buf.length;
  let explained = 0;
  for (const f of freqs) explained += mag(buf, f) ** 2 / 2;
  return Math.max(0, total - explained);
}

/** GATE held throughout, with envelope settled by the time the window starts. */
function run(params: Params, n: number): Float32Array {
  const v = new Ctor();
  Object.assign(v.p, params);
  const voct = new Float32Array(n);
  const gate = new Float32Array(n).fill(5);
  const tcv = new Float32Array(n);
  const out = new Float32Array(n);
  v.process([[voct], [gate], [tcv]], [[out]]);
  return out;
}

describe('fmvoice.dsp', () => {
  it('ratio 1:1 on algorithm 0 gives a clean sine at the tuned pitch', () => {
    const out = run(
      { tune: 220, r1: 1, r2: 1, r3: 1, r4: 1, l1: 1, l2: 0, l3: 0, l4: 0, atk: 0.002, dec: 2, algo: 0 },
      8000,
    );
    const win = out.slice(4000, 4000 + 2048);
    expect(rms(win)).toBeGreaterThan(1);
    // a pure sine's Goertzel magnitude approaches its peak (rms * sqrt(2)); modulator LEVELs
    // are 0 here so no FM sidebands should dilute it
    expect(mag(win, 220) / rms(win)).toBeGreaterThan(1.3);
  });

  it('switching algorithm with identical operator settings changes the spectrum', () => {
    // 200 Hz divides the sample rate evenly, so a 2400-sample window (10 whole periods) has
    // no DFT leakage for it or its 2x/3x/4x ratio partners — a real requirement for `residual`
    // to mean anything, not an artifact of algorithm choice.
    const params: Params = {
      tune: 200,
      r1: 1, // RATIOS[1] = 1 -> 200 Hz
      r2: 3, // RATIOS[3] = 2 -> 400 Hz
      r3: 4, // RATIOS[4] = 3 -> 600 Hz
      r4: 5, // RATIOS[5] = 4 -> 800 Hz
      l1: 0.8,
      l2: 0.6,
      l3: 0.4,
      l4: 0.5,
      atk: 0.002,
      dec: 1000, // negligible decay inside the measurement window: an amplitude-flat tone
    };
    const freqs = [200, 400, 600, 800];
    const parallel = run({ ...params, algo: 2 }, 8000).slice(4800, 4800 + 2400);
    const stack = run({ ...params, algo: 0 }, 8000).slice(4800, 4800 + 2400);

    // PARALLEL is four independent carriers: almost fully explained by those four bins
    expect(residual(parallel, freqs)).toBeLessThan(0.05);
    // STACK cross-modulates: FM sidebands land well outside those four bins
    expect(residual(stack, freqs)).toBeGreaterThan(residual(parallel, freqs) * 5);
  });
});
