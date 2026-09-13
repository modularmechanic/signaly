import { describe, expect, it } from 'vitest';
import { loadProcessor, SR } from '../../../tests/dsp-harness';

describe('ddelay.dsp', () => {
  it('index 0 of SYNC_DIV is the FREE sentinel', async () => {
    // loadProcessor first: the prelude's `class Base extends AudioWorkletProcessor` only
    // evaluates once the worklet globals are stubbed.
    await loadProcessor('ddelay');
    const { SYNC_DIV } = await import('../../engine/dsp-prelude');
    expect(SYNC_DIV[0]).toBe(0);
    expect(SYNC_DIV).toHaveLength(10);
  });

  it('places an impulse at the delay time when the glide has settled', async () => {
    const time = 0.01; // 480 samples @ 48k
    const d = await loadProcessor('ddelay', { time, fb: 0, mix: 1, tone: 16000, sync: 0 });

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

  it('stays bounded with the feedback knob at maximum', async () => {
    const d = await loadProcessor('ddelay', { time: 0.005, fb: 0.98, mix: 1, tone: 16000, sync: 0 });
    const n = 128;
    const imp = new Float32Array(n);
    imp[0] = 5;
    const out = new Float32Array(n);
    d.process([[imp], [], [], [], [], []], [[out]]);
    const silence = new Float32Array(n);
    for (let b = 0; b < 400; b++) d.process([[silence], [], [], [], [], []], [[out]]);
    for (const v of out) expect(Math.abs(v)).toBeLessThan(10);
  });

  it('lights the sync LED for a clock pulse that starts mid-block', async () => {
    const d = await loadProcessor('ddelay');
    const n = 128;
    const silence = new Float32Array(n);
    const out = new Float32Array(n);
    const clk = new Float32Array(n);
    clk.fill(5, 100); // rises at sample 100, invisible to a clk[0]-only check
    d.process([[silence], [], [], [], [], [clk]], [[out]]);
    expect(d.port.postMessage.mock.calls.map((c) => c[0])).toEqual([{ t: 'led', id: 'clk', v: 1 }]);
  });
});
