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
let DjFilt: new () => Proc;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', SR);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./djfilt.dsp');
  DjFilt = reg.mock.calls[0]?.[1] as new () => Proc;
});

/** RMS of the second half of the output for a `hz` tone at the given SWEEP position. */
function rmsAt(sweep: number, hz: number): number {
  const f = new DjFilt();
  Object.assign(f.p, { sweep, cvA: 0 });
  const n = 9600;
  const inp = new Float32Array(n);
  for (let i = 0; i < n; i++) inp[i] = Math.sin((2 * Math.PI * hz * i) / SR) * 4;
  const out = new Float32Array(n);
  f.process([[inp]], [[out]]);
  let sum = 0;
  for (let i = n / 2; i < n; i++) sum += (out[i] ?? 0) * (out[i] ?? 0);
  return Math.sqrt(sum / (n / 2));
}

const LOW = 100;
const HIGH = 8000;

describe('djfilt.dsp', () => {
  it('is transparent at centre', () => {
    const low = rmsAt(0, LOW);
    const high = rmsAt(0, HIGH);
    // both ends pass through close to full level, not just close to each other
    expect(low).toBeGreaterThan(2.5);
    expect(high).toBeGreaterThan(2.2);
  });

  it('sweeps a low pass one way, attenuating the high end', () => {
    const low = rmsAt(-1, LOW);
    const high = rmsAt(-1, HIGH);
    expect(low).toBeGreaterThan(high * 10);
  });

  it('sweeps a high pass the other way, attenuating the low end', () => {
    const low = rmsAt(1, LOW);
    const high = rmsAt(1, HIGH);
    expect(high).toBeGreaterThan(low * 10);
  });
});
