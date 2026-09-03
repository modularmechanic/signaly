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
let FixedBank: new () => Proc;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', SR);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./fixedbank.dsp');
  FixedBank = reg.mock.calls[0]?.[1] as new () => Proc;
});

/** RMS of the second half of the output with only `b3` open, driven by a `hz` tone. */
function band3Only(hz: number): number {
  const f = new FixedBank();
  for (let i = 1; i <= 8; i++) f.p[`b${i}`] = i === 3 ? 1 : 0;
  const n = 9600;
  const inp = new Float32Array(n);
  for (let i = 0; i < n; i++) inp[i] = Math.sin((2 * Math.PI * hz * i) / SR) * 4;
  const out = new Float32Array(n);
  f.process([[inp]], [[out]]);
  let sum = 0;
  for (let i = n / 2; i < n; i++) sum += (out[i] ?? 0) * (out[i] ?? 0);
  return Math.sqrt(sum / (n / 2));
}

describe('fixedbank.dsp', () => {
  it('band 3 alone passes its own centre and rejects a tone two bands away', () => {
    const atCentre = band3Only(400); // band 3's fixed centre
    const twoBelow = band3Only(100); // band 1's centre, two bands down
    const twoAbove = band3Only(1600); // band 5's centre, two bands up
    expect(atCentre).toBeGreaterThan(1);
    expect(twoBelow).toBeLessThan(atCentre * 0.2);
    expect(twoAbove).toBeLessThan(atCentre * 0.2);
  });
});
