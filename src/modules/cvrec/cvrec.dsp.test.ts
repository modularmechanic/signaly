import { beforeAll, describe, expect, it, vi } from 'vitest';

class FakeProcessor {
  port = { onmessage: null, postMessage: (): void => {} };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
  p: Record<string, number>;
}
let CvRec: new () => Proc;

const STEPS = 96; // 1 bar at 24 ppq

beforeAll(async () => {
  vi.stubGlobal('sampleRate', 48000);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./cvrec.dsp');
  CvRec = reg.mock.calls[0]![1] as new () => Proc;
});

/** One clock pulse per call, sampling `value(step)` on IN; returns OUT read right after
    each edge (the sample the new step's held value first appears). */
function runClocks(c: Proc, steps: number, value: (step: number) => number): number[] {
  const hi = new Float32Array(4).fill(5);
  const lo = new Float32Array(4);
  const O = [[new Float32Array(4)]];
  const out: number[] = [];
  for (let s = 0; s < steps; s++) {
    const inp = new Float32Array(4).fill(value(s));
    c.process([[inp], [hi], []], O);
    out.push(O[0]![0]![0] ?? 0);
    c.process([[inp], [lo], []], O);
  }
  return out;
}

describe('cvrec.dsp', () => {
  it('plays back what it recorded, one full bar looped', () => {
    const c = new CvRec();
    c.p.bars = 1;
    c.p.rec = 1;
    // The value actually fed to IN at each step — not the DSP's own output, which during
    // recording still reflects the buffer slot from *before* this step was written.
    const values = Array.from({ length: STEPS }, (_, s) => -5 + (10 * s) / (STEPS - 1));
    runClocks(c, STEPS, (s) => values[s]!);

    c.p.rec = 0;
    // Reset the playhead to the start of the loop before reading it back.
    const O = [[new Float32Array(4)]];
    c.process([[new Float32Array(4)], [new Float32Array(4)], [new Float32Array(4).fill(5)]], O);
    c.process([[new Float32Array(4)], [new Float32Array(4)], [new Float32Array(4)]], O);

    const played = runClocks(c, STEPS, () => 0);
    // Each clock advances the playhead before the sample is read, so the value that
    // appears right after clock k is what was recorded at step (k+1) mod STEPS.
    for (let k = 0; k < STEPS; k++) {
      expect(played[k]).toBeCloseTo(values[(k + 1) % STEPS]!, 4);
    }
  });
});
