import { beforeAll, describe, expect, it, vi } from 'vitest';

class FakeProcessor {
  port = { onmessage: null, postMessage: (): void => {} };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
  p: Record<string, number>;
}
let Xfade: new () => Proc;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', 48000);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./xfade.dsp');
  Xfade = reg.mock.calls[0]![1] as new () => Proc;
});

const N = 16;
const held = (v: number): Float32Array[] => [new Float32Array(N).fill(v)];

/** [L, R] volts for held A and B levels. */
function out(p: Record<string, number>, av: number, bv: number): [number, number] {
  const x = new Xfade();
  Object.assign(x.p, p);
  const O = [[new Float32Array(N)], [new Float32Array(N)]];
  x.process([held(av), held(bv), [], []], O);
  return [O[0]![0]![N - 1]!, O[1]![0]![N - 1]!];
}

/** Gains applied to A and B at this fade, read off the left channel with PAN hard left. */
const gains = (fade: number): [number, number] => [
  out({ fade, pan: -1 }, 5, 0)[0] / 5,
  out({ fade, pan: -1 }, 0, 5)[0] / 5,
];

describe('xfade.dsp', () => {
  it('is all A at fade 0 and all B at fade 1', () => {
    expect(out({ fade: 0, pan: -1 }, 5, -3)).toEqual([5, 0]);
    expect(out({ fade: 1, pan: -1 }, 5, -3)[0]).toBeCloseTo(-3, 5);
  });

  it('holds constant power across the sweep instead of summing to 2', () => {
    const power = [0, 0.25, 0.5, 0.75, 1].map((f) => {
      const [ga, gb] = gains(f);
      return ga * ga + gb * gb;
    });
    for (const p of power) expect(p).toBeCloseTo(1, 5);
    // the mid-point sits at -3 dB per side (0.707), not at the linear 0.5
    expect(gains(0.5)[0]).toBeCloseTo(Math.SQRT1_2, 5);
    expect(gains(0.5)[0] + gains(0.5)[1]).toBeGreaterThan(1.4);
  });

  it('pans the mixed result and clamps to the +/-5 V rail', () => {
    const [l, r] = out({ fade: 0, pan: 1 }, 5, 0);
    expect(l).toBeCloseTo(0, 5);
    expect(r).toBeCloseTo(5, 5);
    // both inputs at the rail through the mid-point would reach 7.07 V unclamped
    expect(out({ fade: 0.5, pan: -1 }, 5, 5)[0]).toBe(5);
  });

  it('sweeps the fade from FADE CV', () => {
    const x = new Xfade();
    x.p.fade = 0;
    x.p.pan = -1;
    const O = [[new Float32Array(N)], [new Float32Array(N)]];
    x.process([held(0), held(5), held(5)], O);
    expect(O[0]![0]![N - 1]!).toBeCloseTo(5, 5); // +5 V of CV = full travel to B
  });
});
