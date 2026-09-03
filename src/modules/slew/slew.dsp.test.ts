import { beforeAll, describe, expect, it, vi } from 'vitest';

class FakeProcessor {
  port = { onmessage: null, postMessage: (): void => {} };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
  p: Record<string, number>;
}
let Slew: new () => Proc;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', 48000);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./slew.dsp');
  Slew = reg.mock.calls[0]![1] as new () => Proc;
});

const N = 5000;
const STEP_DOWN = 2500;

/** Both inputs step 0 -> 5 V at sample 0 and back to 0 V at STEP_DOWN. */
function run(p: Record<string, number>): { o1: Float32Array; o2: Float32Array } {
  const s = new Slew();
  Object.assign(s.p, p);
  const step = new Float32Array(N);
  for (let i = 0; i < STEP_DOWN; i++) step[i] = 5;
  const O = [[new Float32Array(N)], [new Float32Array(N)]];
  s.process([[step], [step]], O);
  return { o1: O[0]![0]!, o2: O[1]![0]! };
}

/** Samples taken from `from` until `y` first satisfies `hit`. */
const span = (y: Float32Array, from: number, hit: (v: number) => boolean): number => {
  for (let i = from; i < y.length; i++) if (hit(y[i]!)) return i - from;
  return -1;
};

const arrive = (y: Float32Array): number => span(y, 0, (v) => v >= 4.99);
const leave = (y: Float32Array): number => span(y, STEP_DOWN, (v) => v <= 0.01);

// 5 V at 48 kHz: 10 ms rise = 480 samples, 20 ms = 960, 40 ms fall = 1920.
describe('slew.dsp', () => {
  it('takes RISE to reach the step and FALL to return, independently per channel', () => {
    const { o1, o2 } = run({ r1: 0.01, f1: 0.04, r2: 0.02, f2: 0.01, link: 0 });
    expect(arrive(o1)).toBeGreaterThan(470);
    expect(arrive(o1)).toBeLessThan(492);
    expect(leave(o1)).toBeGreaterThan(1900);
    expect(leave(o1)).toBeLessThan(1940);
    // channel 2 rises half as fast and falls four times faster — nothing is shared
    expect(arrive(o2)).toBeGreaterThan(950);
    expect(arrive(o2)).toBeLessThan(972);
    expect(leave(o2)).toBeGreaterThan(470);
    expect(leave(o2)).toBeLessThan(492);
  });

  it('drives both channels from channel 1 when LINK is on', () => {
    const { o1, o2 } = run({ r1: 0.01, f1: 0.04, r2: 0.02, f2: 0.01, link: 1 });
    expect(arrive(o2)).toBe(arrive(o1));
    expect(leave(o2)).toBe(leave(o1));
  });

  it('passes a slow signal through untouched', () => {
    const { o1 } = run({ r1: 0.001, f1: 0.001, r2: 0.001, f2: 0.001, link: 0 });
    expect(o1[2000]!).toBeCloseTo(5, 5);
    expect(o1[4999]!).toBeCloseTo(0, 5);
  });
});
