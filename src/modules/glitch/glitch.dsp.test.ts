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
  await import('./glitch.dsp');
  Ctor = reg.mock.calls[0]?.[1] as new () => Proc;
});

/** A non-periodic-at-loop-scale test tone so an accidental period match can't fake a pass. */
function tone(n: number): Float32Array {
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) b[i] = Math.sin(i * 0.037) * 3 + Math.sin(i * 0.011) * 1.5;
  return b;
}

describe('glitch.dsp', () => {
  it('passes the dry signal through unchanged at MIX 0', () => {
    const g = new Ctor();
    Object.assign(g.p, { length: 60, repeats: 3, prob: 1, pitch: 3, mix: 0, sync: 0 });
    const n = 4000;
    const inp = tone(n);
    const clk = new Float32Array(n);
    clk[100] = 5; // fires a would-be repeat, but MIX 0 must still be dry
    const out = new Float32Array(n);
    g.process([[inp], [clk], []], [[out]]);
    let worst = 0;
    for (let i = 0; i < n; i++) worst = Math.max(worst, Math.abs((out[i] ?? 0) - (inp[i] ?? 0)));
    expect(worst).toBe(0);
  });

  it('never repeats at PROBABILITY 0', () => {
    const g = new Ctor();
    Object.assign(g.p, { length: 60, repeats: 3, prob: 0, pitch: 3, mix: 1, sync: 0 });
    const n = 12000;
    const inp = tone(n);
    const clk = new Float32Array(n);
    for (let i = 500; i < n; i += 900) clk[i] = 5; // many clock pulses
    const out = new Float32Array(n);
    g.process([[inp], [clk], []], [[out]]);
    let worst = 0;
    for (let i = 0; i < n; i++) worst = Math.max(worst, Math.abs((out[i] ?? 0) - (inp[i] ?? 0)));
    expect(worst).toBe(0);
  });

  it('repeats on every clock at PROBABILITY 1, with the repeat length matching LENGTH', () => {
    const g = new Ctor();
    const lengthMs = 60;
    const repeats = 3;
    Object.assign(g.p, { length: lengthMs, repeats, prob: 1, pitch: 3, mix: 1, sync: 0 });
    const loopLen = Math.round((lengthMs / 1000) * SR); // 2880 samples
    const clockAt = 4000;
    const n = clockAt + loopLen * (repeats + 2);
    const inp = tone(n);
    const clk = new Float32Array(n);
    clk[clockAt] = 5; // a single clock pulse; the repeat must run its own course after it
    const out = new Float32Array(n);
    g.process([[inp], [clk], []], [[out]]);

    // repeats on the clock: output stops tracking the live input right after the pulse
    expect(out[clockAt] ?? 0).not.toBeCloseTo(inp[clockAt] ?? 0, 3);

    // repeat length matches LENGTH: periodic at `loopLen` for as many cycles as REPEATS allows
    let periodWorst = 0;
    for (let i = clockAt; i < clockAt + loopLen * (repeats - 1); i++) {
      periodWorst = Math.max(periodWorst, Math.abs((out[i] ?? 0) - (out[i + loopLen] ?? 0)));
    }
    expect(periodWorst).toBeLessThan(1e-6);

    // and it stops after REPEATS cycles, returning to live passthrough
    const after = clockAt + loopLen * repeats + 50;
    let backWorst = 0;
    for (let i = after; i < n; i++) backWorst = Math.max(backWorst, Math.abs((out[i] ?? 0) - (inp[i] ?? 0)));
    expect(backWorst).toBe(0);
  });
});
