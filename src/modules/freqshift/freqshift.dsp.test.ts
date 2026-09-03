import { beforeAll, describe, expect, it, vi } from 'vitest';

class FakeProcessor {
  port: { onmessage: ((e: MessageEvent) => void) | null } = { onmessage: null };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
  p: Record<string, number>;
}
let FreqShift: new () => Proc;

const SR = 48000;
const HALF = 32; // matches (N-1)/2 for the module's 65-tap FIR

beforeAll(async () => {
  vi.stubGlobal('sampleRate', SR);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./freqshift.dsp');
  FreqShift = reg.mock.calls[0]![1] as new () => Proc;
});

/** Single-frequency correlation energy (a one-bin DFT) over [start,end). */
function toneEnergy(y: Float32Array, start: number, end: number, freq: number, sr: number): number {
  let re = 0,
    im = 0;
  for (let i = start; i < end; i++) {
    const ph = (2 * Math.PI * freq * i) / sr;
    re += y[i]! * Math.cos(ph);
    im += y[i]! * Math.sin(ph);
  }
  return Math.sqrt(re * re + im * im) / (end - start);
}

describe('freqshift.dsp', () => {
  it('passes fully dry input through unchanged (delay-matched to the wet path)', () => {
    const m = new FreqShift();
    m.p.mix = 0;
    const n = 512;
    const inp = new Float32Array(n);
    for (let i = 0; i < n; i++) inp[i] = Math.sin((2 * Math.PI * 220 * i) / SR) * 3;
    const O = [[new Float32Array(n)], [new Float32Array(n)]];
    m.process([[inp]], O);
    const up = O[0]![0]!;
    // the dry path shares the FIR's fixed group delay with the wet path (HALF samples)
    for (let i = HALF; i < n; i++) expect(up[i]).toBeCloseTo(inp[i - HALF]!, 5);
  });

  it('shifts a 1 kHz tone up by SHIFT and removes the original, and shifts DOWN the other way', () => {
    const m = new FreqShift();
    m.p.shift = 100;
    m.p.mix = 1;
    const n = 9600;
    const inp = new Float32Array(n);
    for (let i = 0; i < n; i++) inp[i] = Math.sin((2 * Math.PI * 1000 * i) / SR) * 3;
    const O = [[new Float32Array(n)], [new Float32Array(n)]];
    m.process([[inp]], O);
    const up = O[0]![0]!,
      down = O[1]![0]!;
    const start = 4000,
      end = n;

    const upE1000 = toneEnergy(up, start, end, 1000, SR);
    const upE1100 = toneEnergy(up, start, end, 1100, SR);
    expect(upE1100).toBeGreaterThan(upE1000 * 3);

    const downE1000 = toneEnergy(down, start, end, 1000, SR);
    const downE900 = toneEnergy(down, start, end, 900, SR);
    expect(downE900).toBeGreaterThan(downE1000 * 3);
  });
});
