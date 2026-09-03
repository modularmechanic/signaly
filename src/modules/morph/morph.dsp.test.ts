import { beforeAll, describe, expect, it, vi } from 'vitest';

class FakeProcessor {
  port: { onmessage: ((e: MessageEvent) => void) | null } = { onmessage: null };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
  p: Record<string, number>;
}
let Morph: new () => Proc;

const SR = 48000;
const CUT = 1000;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', SR);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./morph.dsp');
  Morph = reg.mock.calls[0]![1] as new () => Proc;
});

/** Output RMS for a 1 V sine at `hz` with SHAPE at `shape` and cutoff 1 kHz. */
function gain(shape: number, hz: number): number {
  const f = new Morph();
  f.p.shape = shape;
  f.p.cut = CUT;
  const n = 19200;
  const inp = new Float32Array(n);
  for (let i = 0; i < n; i++) inp[i] = Math.sin((2 * Math.PI * hz * i) / SR);
  const O = [[new Float32Array(n)]];
  f.process([[inp]], O);
  const y = O[0]![0]!;
  let sum = 0;
  for (let i = n / 2; i < n; i++) sum += y[i]! * y[i]!;
  return Math.sqrt(sum / (n / 2));
}

describe('morph.dsp', () => {
  it('sweeps low pass -> band pass -> high pass across SHAPE', () => {
    const lp = [gain(0, 200), gain(0, CUT), gain(0, 8000)];
    const bp = [gain(0.5, 200), gain(0.5, CUT), gain(0.5, 8000)];
    const hp = [gain(1, 200), gain(1, CUT), gain(1, 8000)];
    expect(lp[0]!).toBeGreaterThan(lp[2]! * 10);
    expect(bp[1]!).toBeGreaterThan(bp[0]! * 2);
    expect(bp[1]!).toBeGreaterThan(bp[2]! * 2);
    expect(hp[2]!).toBeGreaterThan(hp[0]! * 10);
  });

  it('crossfades rather than switching: a quarter turn sits between the two taps', () => {
    const mid = gain(0.25, 8000);
    expect(mid).toBeGreaterThan(gain(0, 8000));
    expect(mid).toBeLessThan(gain(0.5, 8000));
  });
});
