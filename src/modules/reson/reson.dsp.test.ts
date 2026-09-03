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
  await import('./reson.dsp');
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

describe('reson.dsp', () => {
  it('rings at the tuned frequency and decays over DECAY', () => {
    const r = new Ctor();
    const freq = 220;
    const dec = 0.25;
    Object.assign(r.p, { freq, spread: 7, dec, cvA: 0, mix: 1 });
    const decSamples = Math.round(dec * SR);
    const n = decSamples * 4;
    const inp = new Float32Array(n); // no audio in: isolate the STRIKE-excited ring
    const strike = new Float32Array(n);
    strike[0] = 5; // one-sample trigger pulse
    const out = new Float32Array(n);
    r.process([[inp], [], [strike]], [[out]]);

    const win = 1024;
    const early = out.slice(200, 200 + win);
    const late = out.slice(decSamples * 2, decSamples * 2 + win);

    // rings at the tuned frequency: strong energy right at `freq` shortly after the strike
    expect(mag(early, freq)).toBeGreaterThan(0.3);

    // decays over DECAY: two T60 periods after the strike, energy has collapsed
    expect(rms(late)).toBeLessThan(rms(early) * 0.05);
  });
});
