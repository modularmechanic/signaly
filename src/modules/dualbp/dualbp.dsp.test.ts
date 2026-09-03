import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Params } from '../../engine/dsp-prelude';

const SR = 48000;

class FakeProcessor {
  port = { onmessage: null as ((e: MessageEvent) => void) | null, postMessage: vi.fn() };
}

interface Proc {
  p: Params;
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
}
let DualBp: new () => Proc;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', SR);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./dualbp.dsp');
  DualBp = reg.mock.calls[0]?.[1] as new () => Proc;
});

/** RMS of the second half of the output for a `hz` tone at the given FREQ/SPREAD/RES/MIX. */
function rmsAt(hz: number, freq: number, spread: number, res: number): number {
  const f = new DualBp();
  Object.assign(f.p, { freq, spread, res, cvA: 0, mix: 0.5 });
  const n = 9600;
  const inp = new Float32Array(n);
  for (let i = 0; i < n; i++) inp[i] = Math.sin((2 * Math.PI * hz * i) / SR) * 4;
  const out = new Float32Array(n);
  f.process([[inp]], [[out]]);
  let sum = 0;
  for (let i = n / 2; i < n; i++) sum += (out[i] ?? 0) * (out[i] ?? 0);
  return Math.sqrt(sum / (n / 2));
}

describe('dualbp.dsp', () => {
  it('spread separates two measurable peaks with a null between them', () => {
    const freq = 440,
      spread = 24,
      res = 0.5; // two octaves apart: 220 Hz and 880 Hz
    const f1 = freq / Math.pow(2, spread / 24);
    const f2 = freq * Math.pow(2, spread / 24);
    const atF1 = rmsAt(f1, freq, spread, res);
    const atF2 = rmsAt(f2, freq, spread, res);
    const atMid = rmsAt(freq, freq, spread, res); // geometric mean of f1 and f2
    expect(atF1).toBeGreaterThan(1);
    expect(atF2).toBeGreaterThan(1);
    // the midpoint between two separated peaks sits in a deep null, not on a shoulder
    expect(atMid).toBeLessThan(Math.min(atF1, atF2) * 0.2);
  });
});
