import { describe, expect, it } from 'vitest';
import { loadProcessor } from '../../../tests/dsp-harness';

describe('formant.dsp', () => {
  // CONTEXT.md: audio swings +-5 V. Resonance near 1 makes the band-pass sum ring far past that.
  it('never leaves the +-5 V audio range, even driven hard at full resonance', async () => {
    const f = await loadProcessor('formant', { vowel: 2, res: 1 });
    const out = new Float32Array(128);
    let peak = 0;
    for (let b = 0; b < 200; b++) {
      const sig = new Float32Array(128);
      // 750 Hz square at the +-5 V rail, right under the A/E first formant
      for (let i = 0; i < 128; i++)
        sig[i] = Math.sin((2 * Math.PI * 750 * (b * 128 + i)) / 48000) > 0 ? 5 : -5;
      f.process([[sig], []], [[out]]);
      for (const v of out) peak = Math.max(peak, Math.abs(v));
    }
    expect(peak).toBeGreaterThan(1); // the test actually drives it
    expect(peak).toBeLessThanOrEqual(5);
  });
});
