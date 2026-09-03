import { beforeAll, describe, expect, it, vi } from 'vitest';

class FakeProcessor {
  port: { onmessage: ((e: MessageEvent) => void) | null; postMessage: () => void } = {
    onmessage: null,
    postMessage: () => {},
  };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
  p: Record<string, number>;
  msg(m: { t: string; v?: unknown }): void;
}
let Slicer: new () => Proc;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', 48000);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./slicer.dsp');
  Slicer = reg.mock.calls[0]![1] as new () => Proc;
});

const N = 400; // 4 quarters of 100 samples

/** Each quarter holds a distinct constant value (scaled x5 by the DSP: 0, 1, 2, 3). */
function quarterBuf(): Float32Array {
  const buf = new Float32Array(N);
  for (let i = 0; i < N; i++) buf[i] = Math.floor(i / 100) * 0.2;
  return buf;
}

const average = (y: Float32Array, from: number): number => {
  let sum = 0;
  for (let i = from; i < y.length; i++) sum += y[i]!;
  return sum / (y.length - from);
};

/** One sample of output from a single-sample block, `sel` unpatched, `trig` at the given level. */
function step(s: Proc, trigLevel: number): number {
  const O = [[new Float32Array(1)]];
  s.process([[], [new Float32Array([trigLevel])]], O);
  return O[0]![0]![0]!;
}

describe('slicer.dsp', () => {
  it('CV-selects slice 2 of 4 and plays only that quarter', () => {
    const s = new Slicer();
    s.msg({ t: 'sample', v: quarterBuf() });
    s.p.slices = 4;
    const len = 250;
    // maps to idx 1: floor(((cv/5+1)/2)*4) with cv=-1 -> floor(1.6) === 1
    const cv = new Float32Array(len).fill(-1);
    const O = [[new Float32Array(len)]];
    s.process([[cv], []], O);
    const avg = average(O[0]![0]!, 20);
    expect(avg).toBeGreaterThan(0.9);
    expect(avg).toBeLessThan(1.1);
  });

  it('steps to the next slice on each trigger when no CV is patched', () => {
    const s = new Slicer();
    s.msg({ t: 'sample', v: quarterBuf() });
    s.p.slices = 4;
    const seen: number[] = [Math.round(step(s, 0))];
    for (let k = 0; k < 3; k++) {
      seen.push(Math.round(step(s, 5))); // rising edge — same-sample output already reflects the new slice
      step(s, 0); // fall back below threshold so the next pulse is a new rising edge
    }
    expect(seen).toEqual([0, 1, 2, 3]);
  });
});
