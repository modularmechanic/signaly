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
  await import('./pitch.dsp');
  Ctor = reg.mock.calls[0]?.[1] as new () => Proc;
});

/** Fundamental frequency of `b` from `start` on, by counting rising zero crossings. */
function fundamental(b: Float32Array, start: number): number {
  let crossings = 0;
  let prev = b[start] ?? 0;
  for (let i = start + 1; i < b.length; i++) {
    const v = b[i] ?? 0;
    if (prev <= 0 && v > 0) crossings++;
    prev = v;
  }
  return (crossings * SR) / (b.length - start);
}

/** A 300 Hz, 4 V sine run through the shifter with both voices at `semis`, FEEDBACK off. */
function shift(semis: number, n: number): Float32Array {
  const p = new Ctor();
  Object.assign(p.p, { shift1: semis, shift2: semis, scvA: 0, window: 50, fb: 0, mix: 1 });
  const inp = new Float32Array(n);
  for (let i = 0; i < n; i++) inp[i] = 4 * Math.sin((2 * Math.PI * 300 * i) / SR);
  const out = new Float32Array(n);
  p.process([[inp], []], [[out]]);
  return out;
}

describe('pitch.dsp', () => {
  it('passes the dry signal through unchanged at MIX 0', () => {
    const p = new Ctor();
    Object.assign(p.p, { shift1: 12, shift2: -5, scvA: 0, window: 50, fb: 0.5, mix: 0 });
    const n = 512;
    const inp = new Float32Array(n);
    for (let i = 0; i < n; i++) inp[i] = 4.5 * Math.sin(i * 0.2);
    const out = new Float32Array(n);
    p.process([[inp], []], [[out]]);
    let worst = 0;
    for (let i = 0; i < n; i++) worst = Math.max(worst, Math.abs((out[i] ?? 0) - (inp[i] ?? 0)));
    expect(worst).toBe(0);
  });

  it('a +12 semitone shift doubles the fundamental; a 0 shift leaves it unchanged', () => {
    const n = 20000;
    const skip = 8000; // let the delay line fill and the crossfade settle
    const f0 = fundamental(shift(0, n), skip);
    const f12 = fundamental(shift(12, n), skip);
    expect(f0).toBeGreaterThan(285); // within 5% of the 300 Hz input at SHIFT 0
    expect(f0).toBeLessThan(315);
    expect(f12 / f0).toBeGreaterThan(1.9);
    expect(f12 / f0).toBeLessThan(2.1);
  });
});
