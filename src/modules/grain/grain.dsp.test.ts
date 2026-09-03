import { beforeAll, describe, expect, it, vi } from 'vitest';

class FakeProcessor {
  port: { onmessage: ((e: MessageEvent) => void) | null } = { onmessage: null };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
  p: Record<string, number>;
}
let Grain: new () => Proc;

const SR = 48000;
const N = SR * 3;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', SR);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./grain.dsp');
  Grain = reg.mock.calls[0]![1] as new () => Proc;
});

/** Gaps between grain onsets, in samples, once the capture buffer has filled. */
function onsetGaps(spray: number): number[] {
  const g = new Grain();
  g.p.size = 0.02;
  g.p.dens = 5;
  g.p.spray = spray;
  g.p.mix = 1;
  g.p.pos = 0;
  const inp = new Float32Array(N).fill(5);
  const O = [[new Float32Array(N)], [new Float32Array(N)]];
  g.process([[inp]], O);
  const y = O[0]![0]!;
  const gaps: number[] = [];
  let prev = -1;
  for (let i = SR / 2; i < N; i++) {
    if (Math.abs(y[i]!) > 0.05 && Math.abs(y[i - 1]!) <= 0.05) {
      if (prev > 0) gaps.push(i - prev);
      prev = i;
    }
  }
  return gaps;
}

const spread = (g: number[]): number => Math.max(...g) - Math.min(...g);

describe('grain.dsp', () => {
  it('schedules periodic onsets at spray 0 and scatters them as spray opens', () => {
    const tight = onsetGaps(0);
    const loose = onsetGaps(0.9);
    expect(tight.length).toBeGreaterThan(8);
    expect(loose.length).toBeGreaterThan(5);
    // 5 Hz -> one grain every 9600 samples, to the sample, until spray jitters it
    expect(tight.every((n) => Math.abs(n - 9600) <= 1)).toBe(true);
    expect(spread(loose)).toBeGreaterThan(1000);
  });

  it('windows each grain and stays inside +-5 V', () => {
    const g = new Grain();
    g.p.size = 0.02;
    g.p.dens = 5;
    g.p.mix = 1;
    g.p.pos = 0;
    const n = SR;
    const inp = new Float32Array(n).fill(5);
    const O = [[new Float32Array(n)], [new Float32Array(n)]];
    g.process([[inp]], O);
    let peak = 0,
      quiet = 0;
    for (let i = SR / 2; i < n; i++) {
      peak = Math.max(peak, Math.abs(O[0]![0]![i]!));
      if (Math.abs(O[0]![0]![i]!) < 0.01) quiet++;
    }
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThanOrEqual(5);
    // 20 ms grains 200 ms apart: most of the window is silence between them
    expect(quiet).toBeGreaterThan(SR / 4);
  });
});
