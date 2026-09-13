import { describe, expect, it } from 'vitest';
import { loadProcessor, SR } from '../../../tests/dsp-harness';

describe('rvsdelay.dsp', () => {
  it('passes fully dry input through unchanged at mix 0', async () => {
    const m = await loadProcessor('rvsdelay');
    m.p.mix = 0;
    const n = 512;
    const inp = new Float32Array(n);
    for (let i = 0; i < n; i++) inp[i] = Math.sin((2 * Math.PI * 220 * i) / SR) * 3;
    const O = [[new Float32Array(n)]];
    m.process([[inp]], O);
    expect(Array.from(O[0]![0]!)).toEqual(Array.from(inp));
  });

  it('plays the second chunk back in reverse', async () => {
    // matches the constructor's own initial chunk length, so the very first (silent) phase
    // and the TIME knob agree from sample 0 -- overriding TIME to something shorter would only
    // take effect at the next chunk boundary, well past this short test's window.
    const chunkSec = 0.3;
    const chunk = Math.round(chunkSec * SR);
    const xf = Math.max(8, Math.min(Math.round(chunk * 0.08), Math.floor(chunk / 2) - 1));
    const total = chunk * 2;
    const inp = new Float32Array(total);
    // a ramp from 0 up to ~4 across the first chunk only; the rest stays silent
    for (let i = 0; i < chunk; i++) inp[i] = (i / chunk) * 4;
    const m = await loadProcessor('rvsdelay');
    m.p.time = chunkSec;
    m.p.mix = 1;
    const O = [[new Float32Array(total)]];
    m.process([[inp]], O);
    const y = O[0]![0]!;
    // the second playback phase (output samples [chunk, 2*chunk)) replays the recorded ramp
    // reversed: high near its own start, low near its own end, clear of the crossfade seams
    const early = y[chunk + 10]!;
    const late = y[2 * chunk - xf - 10]!;
    expect(early).toBeGreaterThan(3);
    expect(late).toBeLessThan(1);
    expect(early).toBeGreaterThan(late);
  });
});
