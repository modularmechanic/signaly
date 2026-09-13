import { describe, expect, it } from 'vitest';
import { loadProcessor, SR } from '../../../tests/dsp-harness';

const F = 100;

/** Share of the output power that is NOT the 100 Hz fundamental — i.e. brightness. */
async function brightness(pos: number): Promise<number> {
  const w = await loadProcessor('wavetable');
  w.p.pos = pos;
  const n = 9600;
  const vo = new Float32Array(n).fill(Math.log2(F / 261.626));
  const O = [[new Float32Array(n)]];
  w.process([[vo]], O);
  const y = O[0]![0]!;
  let re = 0,
    im = 0,
    tot = 0;
  const half = n / 2;
  for (let i = half; i < n; i++) {
    const s = y[i]!;
    const a = (2 * Math.PI * F * i) / SR;
    re += s * Math.cos(a);
    im += s * Math.sin(a);
    tot += s * s;
  }
  const power = tot / half;
  return (power - (2 * (re * re + im * im)) / (half * half)) / power;
}

describe('wavetable.dsp', () => {
  it('scans continuously: harmonic content rises monotonically across a table pair', async () => {
    // pos 0..1/7 crossfades table 0 (sine, no harmonics) into table 1 (triangle).
    const steps: number[] = [];
    for (const f of [0, 0.25, 0.5, 0.75, 1]) steps.push(await brightness(f / 7));
    for (let i = 1; i < steps.length; i++) expect(steps[i]!).toBeGreaterThan(steps[i - 1]!);
    expect(steps[0]!).toBeLessThan(0.001);
    expect(steps[4]!).toBeGreaterThan(20 * steps[0]!);
  });

  it('gets brighter still at the top of the bank and stays inside +-5 V', async () => {
    expect(await brightness(1)).toBeGreaterThan(await brightness(3 / 7));
    const w = await loadProcessor('wavetable');
    w.p.pos = 1;
    const O = [[new Float32Array(2048)]];
    w.process([[new Float32Array(2048)]], O);
    for (const s of O[0]![0]!) expect(Math.abs(s)).toBeLessThanOrEqual(5);
  });
});
