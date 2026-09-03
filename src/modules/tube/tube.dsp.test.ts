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
  await import('./tube.dsp');
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

/** Run a 220 Hz, 5 V sine through the valve stage. */
function run(params: Partial<Params>): Float32Array {
  const t = new Ctor();
  Object.assign(t.p, { drive: 3, bias: 0, sag: 0.3, tone: 6000, level: 0.8, type: 0, ...params });
  const n = 4800;
  const inp = new Float32Array(n);
  for (let i = 0; i < n; i++) inp[i] = 5 * Math.sin((2 * Math.PI * 220 * i) / SR);
  const out = new Float32Array(n);
  t.process([[inp], []], [[out]]);
  return out;
}

/** Second-harmonic energy relative to the fundamental — rises as the valve saturates. */
function h2(buf: Float32Array): number {
  const f1 = mag(buf, 220);
  const f2 = mag(buf, 440);
  return f2 / Math.max(f1, 1e-9);
}

/** 2nd:3rd harmonic ratio — the character that separates the five tube types. */
function h23(buf: Float32Array): number {
  const f2 = mag(buf, 440);
  const f3 = mag(buf, 660);
  return f2 / Math.max(f3, 1e-9);
}

describe('tube.dsp', () => {
  it('stays near silent when LEVEL is near zero', () => {
    const out = run({ level: 0.001, drive: 10 });
    let peak = 0;
    for (const v of out) peak = Math.max(peak, Math.abs(v));
    expect(peak).toBeLessThan(0.05);
  });

  it('gains second-harmonic content as DRIVE rises', () => {
    const low = h2(run({ drive: 0.6 }));
    const high = h2(run({ drive: 12 }));
    expect(high).toBeGreaterThan(low * 1.5);
  });

  it('gives each of the five tube types a distinct 2nd:3rd harmonic ratio', () => {
    const ratios = [0, 1, 2, 3, 4].map((type) => h23(run({ drive: 6, type })));
    const sorted = [...ratios].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]! - sorted[i - 1]!).toBeGreaterThan(0.02);
    }
  });
});
