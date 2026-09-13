import { describe, expect, it } from 'vitest';
import { loadProcessor, SR } from '../../../tests/dsp-harness';

/** RMS in the last 0.15s of a run whose input is a burst followed by silence. */
async function tailEnergy(fb: number): Promise<number> {
  const g = await loadProcessor('gdelay');
  g.p.size = 0.05;
  g.p.dens = 20;
  g.p.spray = 0;
  g.p.mix = 1;
  g.p.fb = fb;
  g.p.pitch = 0;
  const burst = Math.round(SR * 0.15);
  const total = Math.round(SR * 0.4);
  const inp = new Float32Array(total);
  for (let i = 0; i < burst; i++) inp[i] = Math.sin((2 * Math.PI * 300 * i) / SR) * 4;
  const O = [[new Float32Array(total)]];
  g.process([[inp]], O);
  const y = O[0]![0]!;
  const tail = Math.round(SR * 0.15);
  let sum = 0;
  for (let i = total - tail; i < total; i++) sum += y[i]! * y[i]!;
  return Math.sqrt(sum / tail);
}

describe('gdelay.dsp', () => {
  it('passes fully dry input through unchanged', async () => {
    const g = await loadProcessor('gdelay');
    g.p.mix = 0;
    g.p.fb = 0.9;
    g.p.dens = 20;
    const n = 512;
    const inp = new Float32Array(n);
    for (let i = 0; i < n; i++) inp[i] = Math.sin((2 * Math.PI * 220 * i) / SR) * 3;
    const O = [[new Float32Array(n)]];
    g.process([[inp]], O);
    expect(Array.from(O[0]![0]!)).toEqual(Array.from(inp));
  });

  it('feeds grain output back so echoes persist after the input stops', async () => {
    const withFb = await tailEnergy(0.9);
    const noFb = await tailEnergy(0);
    expect(noFb).toBeLessThan(0.05);
    expect(withFb).toBeGreaterThan(noFb + 0.1);
  });
});
