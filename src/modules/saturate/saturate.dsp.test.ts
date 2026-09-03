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
  await import('./saturate.dsp');
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

/** Run a sine at `f` Hz, 3 V, through the saturator. */
function run(f: number, params: Partial<Params>): Float32Array {
  const s = new Ctor();
  Object.assign(s.p, { drive: 1, bias: 0, tilt: 0, level: 0.8, mode: 0, ...params });
  const n = 4800;
  const inp = new Float32Array(n);
  for (let i = 0; i < n; i++) inp[i] = 3 * Math.sin((2 * Math.PI * f * i) / SR);
  const out = new Float32Array(n);
  s.process([[inp], []], [[out]]);
  return out;
}

describe('saturate.dsp', () => {
  it('stays near silent when LEVEL is near zero', () => {
    const out = run(220, { level: 0.001, drive: 4 });
    let peak = 0;
    for (const v of out) peak = Math.max(peak, Math.abs(v));
    expect(peak).toBeLessThan(0.05);
  });

  it('CONSOLE keeps a 7 kHz tone that TAPE rolls off', () => {
    const tape = mag(run(7000, { mode: 0 }), 7000);
    const console_ = mag(run(7000, { mode: 1 }), 7000);
    expect(console_).toBeGreaterThan(tape * 3);
  });
});
