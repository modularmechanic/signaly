import { describe, expect, it } from 'vitest';
import { loadProcessor, SR } from '../../../tests/dsp-harness';

/** RMS of the second half of a 3 kHz tone at the given amplitude and DIRECTION. */
async function hfEnergy(amp: number, dir: number): Promise<number> {
  const f = await loadProcessor('envfilt');
  f.p.dir = dir;
  f.p.sens = 1;
  f.p.freq = 300;
  f.p.mix = 1;
  f.p.atk = 0.001;
  f.p.rel = 0.01;
  const n = 24000;
  const inp = new Float32Array(n);
  for (let i = 0; i < n; i++) inp[i] = Math.sin((2 * Math.PI * 3000 * i) / SR) * amp;
  const O = [[new Float32Array(n)]];
  f.process([[inp]], O);
  const y = O[0]![0]!;
  let sum = 0;
  for (let i = n / 2; i < n; i++) sum += y[i]! * y[i]!;
  return Math.sqrt(sum / (n / 2));
}

describe('envfilt.dsp', () => {
  it('passes fully dry input through unchanged at mix 0', async () => {
    const f = await loadProcessor('envfilt');
    f.p.mix = 0;
    const n = 512;
    const inp = new Float32Array(n);
    for (let i = 0; i < n; i++) inp[i] = Math.sin((2 * Math.PI * 3000 * i) / SR) * 3;
    const O = [[new Float32Array(n)]];
    f.process([[inp]], O);
    expect(Array.from(O[0]![0]!)).toEqual(Array.from(inp));
  });

  it('opens the filter upward on loud input and closes it downward when DIRECTION flips', async () => {
    const loudUp = await hfEnergy(4, 0);
    const quietUp = await hfEnergy(0.3, 0);
    expect(loudUp).toBeGreaterThan(quietUp);

    const loudDown = await hfEnergy(4, 1);
    const quietDown = await hfEnergy(0.3, 1);
    expect(loudDown).toBeLessThan(quietDown);
  });
});
