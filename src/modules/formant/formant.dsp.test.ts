import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Params } from '../../engine/dsp-prelude';

class FakeProcessor {
  port = { onmessage: null as ((e: MessageEvent) => void) | null, postMessage: vi.fn() };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
}
type Ctor = new (o?: { processorOptions?: { p?: Params } }) => Proc;

let Formant: Ctor;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', 48000);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./formant.dsp');
  Formant = reg.mock.calls[0]![1] as Ctor;
});

describe('formant.dsp', () => {
  // CONTEXT.md: audio swings +-5 V. Resonance near 1 makes the band-pass sum ring far past that.
  it('never leaves the +-5 V audio range, even driven hard at full resonance', () => {
    const f = new Formant({ processorOptions: { p: { vowel: 2, res: 1 } } });
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
