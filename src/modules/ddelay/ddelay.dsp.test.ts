import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Params } from '../../engine/dsp-prelude';

const SR = 48000;

const post = vi.fn();

class FakeProcessor {
  port = { onmessage: null as ((e: MessageEvent) => void) | null, postMessage: post };
}

interface Proc {
  p: Params;
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
}
let Ctor: new () => Proc;
let SYNC_DIV: readonly number[];

beforeAll(async () => {
  vi.stubGlobal('sampleRate', SR);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  ({ SYNC_DIV } = await import('../../engine/dsp-prelude'));
  await import('./ddelay.dsp');
  Ctor = reg.mock.calls[0]?.[1] as new () => Proc;
});

describe('ddelay.dsp', () => {
  it('index 0 of SYNC_DIV is the FREE sentinel', () => {
    expect(SYNC_DIV[0]).toBe(0);
    expect(SYNC_DIV).toHaveLength(10);
  });

  it('places an impulse at the delay time when the glide has settled', () => {
    const d = new Ctor();
    const time = 0.01; // 480 samples @ 48k
    Object.assign(d.p, { time, fb: 0, mix: 1, tone: 16000, sync: 0 });

    const n = 512;
    const silence = new Float32Array(n);
    const out = new Float32Array(n);
    // let the delay-time one-pole settle on the target before the impulse
    for (let b = 0; b < 40; b++) d.process([[silence], [], [], [], [], []], [[out]]);

    const imp = new Float32Array(n);
    imp[0] = 5;
    d.process([[imp], [], [], [], [], []], [[out]]);

    let peak = -1;
    let at = -1;
    for (let i = 0; i < n; i++) {
      const v = Math.abs(out[i] ?? 0);
      if (v > peak) {
        peak = v;
        at = i;
      }
    }
    expect(peak).toBeGreaterThan(0.5);
    expect(at).toBeGreaterThan(time * SR - 8);
    expect(at).toBeLessThan(time * SR + 8);
  });

  it('stays bounded with the feedback knob at maximum', () => {
    const d = new Ctor();
    Object.assign(d.p, { time: 0.005, fb: 0.98, mix: 1, tone: 16000, sync: 0 });
    const n = 128;
    const imp = new Float32Array(n);
    imp[0] = 5;
    const out = new Float32Array(n);
    d.process([[imp], [], [], [], [], []], [[out]]);
    const silence = new Float32Array(n);
    for (let b = 0; b < 400; b++) d.process([[silence], [], [], [], [], []], [[out]]);
    for (const v of out) expect(Math.abs(v)).toBeLessThan(10);
  });

  it('lights the sync LED for a clock pulse that starts mid-block', () => {
    post.mockClear();
    const d = new Ctor();
    const n = 128;
    const silence = new Float32Array(n);
    const out = new Float32Array(n);
    const clk = new Float32Array(n);
    clk.fill(5, 100); // rises at sample 100, invisible to a clk[0]-only check
    d.process([[silence], [], [], [], [], [clk]], [[out]]);
    expect(post.mock.calls.map((c) => c[0])).toEqual([{ t: 'led', id: 'clk', v: 1 }]);
  });
});
