import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Params } from '../../engine/dsp-prelude';

const SR = 48000;
const N = 24000;

class FakeProcessor {
  port = { onmessage: null as ((e: MessageEvent) => void) | null, postMessage: vi.fn() };
}

interface Proc {
  p: Params;
  /** LFO phase, 0..1 — the SYNC test reads it directly. */
  ph: number;
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
}
let Ctor: new () => Proc;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', SR);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./phaser.dsp');
  Ctor = reg.mock.calls[0]?.[1] as new () => Proc;
});

/** Goertzel magnitude of `f` over the settled second half of `buf`. */
function mag(buf: Float32Array, f: number): number {
  const w = (2 * Math.PI * f) / SR;
  const c = 2 * Math.cos(w);
  let s1 = 0;
  let s2 = 0;
  for (let i = N / 2; i < N; i++) {
    const s = (buf[i] ?? 0) + c * s1 - s2;
    s2 = s1;
    s1 = s;
  }
  return (2 * Math.hypot(s1 - s2 * Math.cos(w), s2 * Math.sin(w))) / (N / 2);
}

/** Steady-state response to a 5 V sine at `f`, LFO parked (DEPTH 0) so notches sit still. */
function resp(f: number, o: Partial<Params> = {}): number {
  const ph = new Ctor();
  Object.assign(ph.p, { centre: 1000, depth: 0, fb: 0, mix: 0.5, stages: 1 }, o);
  const inp = new Float32Array(N);
  for (let i = 0; i < N; i++) inp[i] = 5 * Math.sin((2 * Math.PI * f * i) / SR);
  const out = new Float32Array(N);
  ph.process([[inp], [], []], [[out]]);
  return mag(out, f);
}

describe('phaser.dsp', () => {
  it('passes the dry signal through untouched at MIX 0', () => {
    const ph = new Ctor();
    Object.assign(ph.p, { centre: 1200, depth: 1, fb: 0.9, mix: 0, rate: 3, stages: 2 });
    const n = 256;
    const inp = new Float32Array(n);
    for (let i = 0; i < n; i++) inp[i] = 5 * Math.sin(i * 0.09);
    const out = new Float32Array(n);
    ph.process([[inp], [], []], [[out]]);
    let d = 0;
    for (let i = 0; i < n; i++) d = Math.max(d, Math.abs((out[i] ?? 0) - (inp[i] ?? 0)));
    expect(d).toBe(0);
  });

  it('notches six stages at centre * tan(15/45/75 deg)', () => {
    // A chain of 6 all-passes reaches -180/-540/-900 deg at 0.268 / 1 / 3.73 x centre.
    for (const f of [268, 1000, 3732]) expect(resp(f)).toBeLessThan(0.2);
    for (const f of [550, 2000]) expect(resp(f)).toBeGreaterThan(4);
  });

  it('moves the notches with CENTRE', () => {
    expect(resp(1000, { centre: 2000 })).toBeGreaterThan(4);
    expect(resp(2000, { centre: 2000 })).toBeLessThan(0.2);
  });

  it('changes the notch pattern with STAGES', () => {
    // 4 stages null at 2.41 x centre and pass 1 x; 8 stages null at 1.50 x centre.
    expect(resp(2414, { stages: 0 })).toBeLessThan(0.2);
    expect(resp(1000, { stages: 0 })).toBeGreaterThan(4);
    expect(resp(1497, { stages: 2 })).toBeLessThan(0.2);
    expect(resp(1000, { stages: 2 })).toBeGreaterThan(4);
  });

  it('FEEDBACK deepens the sweep by lifting the peaks between the notches', () => {
    const flat = resp(550);
    const some = resp(550, { fb: 0.4 });
    const lots = resp(550, { fb: 0.8 });
    expect(some).toBeGreaterThan(flat * 1.05);
    expect(lots).toBeGreaterThan(some * 1.05);
    expect(lots).toBeLessThan(10); // and stays bounded
  });

  it('a patched SYNC clock owns the LFO: one sweep per pulse, restarted on the edge', () => {
    const period = 4800; // 10 Hz
    const run = (clocked: boolean): number => {
      const ph = new Ctor();
      Object.assign(ph.p, { centre: 1000, depth: 1, fb: 0, mix: 0.5, rate: 0.5, stages: 1 });
      ph.ph = 0.37; // starts out of step; the first edge has to pull it to 0
      const inp = new Float32Array(period);
      const clk = new Float32Array(period);
      if (clocked) clk.fill(5, 0, 200); // one rising edge at the head of every chunk
      const out = new Float32Array(period);
      for (let k = 0; k < 4; k++) ph.process([[inp], [], [clk]], [[out]]);
      return ph.ph;
    };
    // Locked: exactly one LFO cycle per clock pulse, so each chunk ends on a whole cycle.
    const locked = run(true);
    expect(Math.min(locked, 1 - locked)).toBeLessThan(0.01);
    // Free at 0.5 Hz: 4 x 100 ms is a fifth of a cycle on top of the 0.37 it started at.
    expect(run(false)).toBeCloseTo(0.57, 2);
  });
});
