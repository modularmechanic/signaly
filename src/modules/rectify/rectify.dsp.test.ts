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
  await import('./rectify.dsp');
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

/** Run a 300 Hz, 5 V sine through the rectifier. */
function run(params: Partial<Params>): Float32Array {
  const r = new Ctor();
  Object.assign(r.p, { drive: 1, level: 0.8, mix: 1, mode: 0, ...params });
  const n = 4800;
  const inp = new Float32Array(n);
  for (let i = 0; i < n; i++) inp[i] = 5 * Math.sin((2 * Math.PI * 300 * i) / SR);
  const out = new Float32Array(n);
  r.process([[inp], []], [[out]]);
  return out;
}

describe('rectify.dsp', () => {
  it('passes the dry signal through untouched at MIX 0', () => {
    const r = new Ctor();
    Object.assign(r.p, { drive: 8, mode: 1, mix: 0 });
    const n = 256;
    const inp = new Float32Array(n);
    for (let i = 0; i < n; i++) inp[i] = 5 * Math.sin(i * 0.13);
    const out = new Float32Array(n);
    r.process([[inp], []], [[out]]);
    let worst = 0;
    for (let i = 0; i < n; i++) worst = Math.max(worst, Math.abs((out[i] ?? 0) - (inp[i] ?? 0)));
    expect(worst).toBe(0);
  });

  it('FULL wave folds the fundamental up an octave; HALF wave keeps it', () => {
    const half = run({ mode: 0 });
    const full = run({ mode: 1 });
    const halfF0 = mag(half, 300);
    const half2F0 = mag(half, 600);
    const fullF0 = mag(full, 300);
    const full2F0 = mag(full, 600);
    // HALF keeps most of its energy at the fundamental.
    expect(halfF0).toBeGreaterThan(half2F0);
    // FULL cancels the fundamental almost entirely and moves it to the octave above.
    expect(full2F0).toBeGreaterThan(fullF0 * 5);
    expect(full2F0).toBeGreaterThan(half2F0);
  });
});
