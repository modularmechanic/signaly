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
  await import('./overdrive.dsp');
  Ctor = reg.mock.calls[0]?.[1] as new () => Proc;
});

/** Goertzel magnitude of `f` in `buf`, read over the settled second half. */
function mag(buf: Float32Array, f: number): number {
  const tail = buf.subarray(buf.length / 2);
  const w = (2 * Math.PI * f) / SR;
  const c = 2 * Math.cos(w);
  let s1 = 0;
  let s2 = 0;
  for (let i = 0; i < tail.length; i++) {
    const s = (tail[i] ?? 0) + c * s1 - s2;
    s2 = s1;
    s1 = s;
  }
  return (2 * Math.hypot(s1 - s2 * Math.cos(w), s2 * Math.sin(w))) / tail.length;
}

/** A 200 Hz + 4 kHz two-tone through the drive at low DRIVE, so the tone stack's own
    shape — not clipping distortion — decides which tone comes out on top. */
function run(tone: number): Float32Array {
  const o = new Ctor();
  Object.assign(o.p, { drive: 1, tone, level: 0.8 });
  const n = 4800;
  const inp = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    inp[i] = 1.5 * Math.sin((2 * Math.PI * 200 * i) / SR) + 1.5 * Math.sin((2 * Math.PI * 4000 * i) / SR);
  }
  const out = new Float32Array(n);
  o.process([[inp], [], []], [[out]]);
  return out;
}

describe('overdrive.dsp', () => {
  it('stays near silent when LEVEL is near zero', () => {
    const o = new Ctor();
    Object.assign(o.p, { drive: 6, tone: 0.5, level: 0.001 });
    const n = 1024;
    const inp = new Float32Array(n).fill(3);
    const out = new Float32Array(n);
    o.process([[inp], [], []], [[out]]);
    let peak = 0;
    for (const v of out) peak = Math.max(peak, Math.abs(v));
    expect(peak).toBeLessThan(0.05);
  });

  it('TONE sweeps the stack from bass-led to treble-led', () => {
    const dark = run(0);
    const bright = run(1);
    const darkLo = mag(dark, 200);
    const darkHi = mag(dark, 4000);
    const brightLo = mag(bright, 200);
    const brightHi = mag(bright, 4000);
    // TONE 0: the low tone leads, unlike DIST's tone (which only ever attenuates highs).
    expect(darkLo).toBeGreaterThan(darkHi * 2);
    // TONE 1: the same input comes out treble-led instead.
    expect(brightHi).toBeGreaterThan(brightLo * 2);
  });
});
