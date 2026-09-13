import { describe, expect, it } from 'vitest';
import { loadProcessor } from '../../../tests/dsp-harness';

/** Kick the filter with a brief impulse, then feed silence, and report the tail RMS
    (does the ringing sustain?) and the peak absolute sample (did it stay clamped?). */
async function kick(res: number, cut: number, n = 20000): Promise<{ tailRms: number; peak: number }> {
  const f = await loadProcessor('ms20', { cut, res, cvA: 0, mode: 0 });
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
  it('self-oscillates at maximum resonance but decays at low resonance', async () => {
    const hot = await kick(1, 6000);
    const tame = await kick(0.3, 6000);
    // high resonance: the kick keeps ringing long after the impulse, unlike a plain filter
    expect(hot.tailRms).toBeGreaterThan(0.05);
    // low resonance: the same kick has died out by the same point
    expect(tame.tailRms).toBeLessThan(0.001);
  });

  it('clamps the self-oscillating output to +-5V', async () => {
    const { peak } = await kick(1, 6000);
    expect(Number.isFinite(peak)).toBe(true);
    expect(peak).toBeLessThanOrEqual(5.0001);
  });
});
