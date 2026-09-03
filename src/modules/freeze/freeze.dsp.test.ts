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
  await import('./freeze.dsp');
  Ctor = reg.mock.calls[0]?.[1] as new () => Proc;
});

describe('freeze.dsp', () => {
  it('passes the dry signal through unchanged at MIX 0', () => {
    const f = new Ctor();
    Object.assign(f.p, { size: 200, pitch: 0, smooth: 0.3, mix: 0, mode: 0 });
    const n = 512;
    const inp = new Float32Array(n);
    for (let i = 0; i < n; i++) inp[i] = 4.5 * Math.sin(i * 0.13);
    const frz = new Float32Array(n).fill(5); // held "frozen" the whole time — MIX 0 must still be dry
    const L = new Float32Array(n);
    const R = new Float32Array(n);
    f.process([[inp], [frz], []], [[L], [R]]);
    let worst = 0;
    for (let i = 0; i < n; i++) {
      worst = Math.max(worst, Math.abs((L[i] ?? 0) - (inp[i] ?? 0)), Math.abs((R[i] ?? 0) - (inp[i] ?? 0)));
    }
    expect(worst).toBe(0);
  });

  it('after freezing, repeats with period SIZE and ignores further input', () => {
    const sizeMs = 40;
    const loopLen = Math.round((sizeMs / 1000) * SR);
    const preroll = loopLen * 3;
    const n = preroll + loopLen * 6;
    const gate = new Float32Array(n);
    for (let i = preroll; i < n; i++) gate[i] = 5; // GATE mode: frozen from `preroll` onward

    const inpA = new Float32Array(n);
    for (let i = 0; i < n; i++) inpA[i] = Math.sin(i * 0.037) * 3 + Math.sin(i * 0.11) * 1.5;
    const inpB = inpA.slice();
    for (let i = preroll; i < n; i++) inpB[i] = Math.sin(i * 0.29) * 4; // different content post-freeze

    function run(input: Float32Array): Float32Array {
      const f = new Ctor();
      Object.assign(f.p, { size: sizeMs, pitch: 0, smooth: 0, mix: 1, mode: 0 });
      const L = new Float32Array(n);
      const R = new Float32Array(n);
      f.process([[input], [gate], []], [[L], [R]]);
      return L;
    }
    const outA = run(inpA);
    const outB = run(inpB);

    // independent of further input: identical whichever post-freeze input was fed
    let indepWorst = 0;
    for (let i = preroll; i < n; i++)
      indepWorst = Math.max(indepWorst, Math.abs((outA[i] ?? 0) - (outB[i] ?? 0)));
    expect(indepWorst).toBeLessThan(1e-6);

    // repeats with period SIZE: every sample matches the one exactly one loop later
    let periodWorst = 0;
    for (let i = preroll; i < n - loopLen; i++) {
      periodWorst = Math.max(periodWorst, Math.abs((outA[i] ?? 0) - (outA[i + loopLen] ?? 0)));
    }
    expect(periodWorst).toBeLessThan(1e-6);

    // and it is not just silence repeating
    let peak = 0;
    for (let i = preroll; i < n; i++) peak = Math.max(peak, Math.abs(outA[i] ?? 0));
    expect(peak).toBeGreaterThan(0.5);
  });
});
