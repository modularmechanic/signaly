import { describe, expect, it } from 'vitest';
import { loadProcessor, SR } from '../../../tests/dsp-harness';

/** RMS of the second half of the output with only `b3` open, driven by a `hz` tone. */
async function band3Only(hz: number): Promise<number> {
  const f = await loadProcessor('fixedbank');
  for (let i = 1; i <= 8; i++) f.p[`b${i}`] = i === 3 ? 1 : 0;
  const n = 9600;
  const inp = new Float32Array(n);
  for (let i = 0; i < n; i++) inp[i] = Math.sin((2 * Math.PI * hz * i) / SR) * 4;
  const out = new Float32Array(n);
  f.process([[inp]], [[out]]);
  let sum = 0;
  for (let i = n / 2; i < n; i++) sum += (out[i] ?? 0) * (out[i] ?? 0);
  return Math.sqrt(sum / (n / 2));
}

describe('fixedbank.dsp', () => {
  it('band 3 alone passes its own centre and rejects a tone two bands away', async () => {
    const atCentre = await band3Only(400); // band 3's fixed centre
    const twoBelow = await band3Only(100); // band 1's centre, two bands down
    const twoAbove = await band3Only(1600); // band 5's centre, two bands up
    expect(atCentre).toBeGreaterThan(1);
    expect(twoBelow).toBeLessThan(atCentre * 0.2);
    expect(twoAbove).toBeLessThan(atCentre * 0.2);
  });
});
