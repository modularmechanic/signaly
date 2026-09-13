import { describe, expect, it } from 'vitest';
import { loadProcessor, SR } from '../../../tests/dsp-harness';

const F = 100;
const PERIOD = SR / F;

/** How far the output strays from being periodic at exactly 100 Hz. */
async function aperiodicity(det: number): Promise<number> {
  const s = await loadProcessor('super');
  s.p.det = det;
  s.p.mix = 0.5;
  const n = 24000;
  const vo = new Float32Array(n).fill(Math.log2(F / 261.626));
  const O = [[new Float32Array(n)], [new Float32Array(n)]];
  s.process([[vo]], O);
  const y = O[0]![0]!;
  let worst = 0;
  for (let i = 12000; i < n - PERIOD; i++) worst = Math.max(worst, Math.abs(y[i]! - y[i + PERIOD]!));
  return worst;
}

describe('super.dsp', () => {
  it('collapses to one frequency at detune 0 and widens as detune opens', async () => {
    const unison = await aperiodicity(0);
    const wide = await aperiodicity(0.5);
    expect(unison).toBeLessThan(0.02);
    expect(wide).toBeGreaterThan(1);
  });

  it('puts different content in L and R and stays inside +-5 V', async () => {
    const s = await loadProcessor('super');
    s.p.det = 0.6;
    const n = 4800;
    const O = [[new Float32Array(n)], [new Float32Array(n)]];
    s.process([[new Float32Array(n)]], O);
    let diff = 0,
      peak = 0;
    for (let i = 0; i < n; i++) {
      diff = Math.max(diff, Math.abs(O[0]![0]![i]! - O[1]![0]![i]!));
      peak = Math.max(peak, Math.abs(O[0]![0]![i]!), Math.abs(O[1]![0]![i]!));
    }
    expect(diff).toBeGreaterThan(0.5);
    expect(peak).toBeLessThanOrEqual(5);
  });
});
