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
let Ms20: new () => Proc;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', SR);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./ms20.dsp');
  Ms20 = reg.mock.calls[0]?.[1] as new () => Proc;
});

/** Kick the filter with a brief impulse, then feed silence, and report the tail RMS
    (does the ringing sustain?) and the peak absolute sample (did it stay clamped?). */
function kick(res: number, cut: number, n = 20000): { tailRms: number; peak: number } {
  const f = new Ms20();
  Object.assign(f.p, { cut, res, cvA: 0, mode: 0 });
  const inp = new Float32Array(n);
  for (let i = 0; i < 8; i++) inp[i] = 5;
  const out = new Float32Array(n);
  f.process([[inp]], [[out]]);
  let sum = 0;
  let peak = 0;
  for (let i = 0; i < n; i++) {
    const v = out[i] ?? 0;
    if (i >= n - 5000) sum += v * v;
    peak = Math.max(peak, Math.abs(v));
  }
  return { tailRms: Math.sqrt(sum / 5000), peak };
}

describe('ms20.dsp', () => {
  it('self-oscillates at maximum resonance but decays at low resonance', () => {
    const hot = kick(1, 6000);
    const tame = kick(0.3, 6000);
    // high resonance: the kick keeps ringing long after the impulse, unlike a plain filter
    expect(hot.tailRms).toBeGreaterThan(0.05);
    // low resonance: the same kick has died out by the same point
    expect(tame.tailRms).toBeLessThan(0.001);
  });

  it('clamps the self-oscillating output to +-5V', () => {
    const { peak } = kick(1, 6000);
    expect(Number.isFinite(peak)).toBe(true);
    expect(peak).toBeLessThanOrEqual(5.0001);
  });
});
