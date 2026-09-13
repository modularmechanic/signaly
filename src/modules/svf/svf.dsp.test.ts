import { describe, expect, it } from 'vitest';
import { loadProcessor, SR } from '../../../tests/dsp-harness';

/** RMS of the LP output for a 2 kHz sine at the given cutoff. */
async function lpEnergy(cut: number): Promise<number> {
  const f = await loadProcessor('svf', { cut });
  const n = 4800;
  const inp = new Float32Array(n);
  for (let i = 0; i < n; i++) inp[i] = Math.sin((2 * Math.PI * 2000 * i) / SR) * 5;
  const O = [[new Float32Array(n)], [new Float32Array(n)], [new Float32Array(n)]];
  f.process([[inp]], O);
  let sum = 0;
  const lp = O[0]![0]!;
  for (let i = n / 2; i < n; i++) sum += lp[i]! * lp[i]!;
  return Math.sqrt(sum / (n / 2));
}

describe('svf.dsp', () => {
  it('passes more energy as the cutoff sweeps up past the tone', async () => {
    const low = await lpEnergy(100);
    const mid = await lpEnergy(2000);
    const high = await lpEnergy(12000);
    expect(low).toBeLessThan(mid);
    expect(mid).toBeLessThan(high);
    expect(high).toBeGreaterThan(2);
  });

  it('stays finite at maximum resonance', async () => {
    const f = await loadProcessor('svf', { res: 1, cut: 16000 });
    const inp = new Float32Array(1024).fill(5);
    const O = [[new Float32Array(1024)], [new Float32Array(1024)], [new Float32Array(1024)]];
    f.process([[inp]], O);
    for (const s of O[0]![0]!) expect(Number.isFinite(s)).toBe(true);
  });
});
