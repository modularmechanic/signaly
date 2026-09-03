import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Params } from '../../engine/dsp-prelude';

class FakeProcessor {
  port = { onmessage: null as ((e: MessageEvent) => void) | null, postMessage: vi.fn() };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
}
type Ctor = new (o?: { processorOptions?: { p?: Params } }) => Proc;

let Gate: Ctor;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', 48000);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./gate.dsp');
  Gate = reg.mock.calls[0]![1] as Ctor;
});

/** Runs 200 blocks of a constant-amplitude tone; returns the last GATE OUT sample. */
function gateOut(p: Params, amp: number): number {
  const g = new Gate({ processorOptions: { p } });
  const sig = new Float32Array(128).fill(amp);
  const O = Array.from({ length: 3 }, () => [new Float32Array(128)]);
  for (let b = 0; b < 200; b++) g.process([[sig], [sig], [], []], O);
  return O[2]![0]![127] ?? -1;
}

describe('gate.dsp', () => {
  it('keeps GATE OUT low below threshold even at maximum RANGE', () => {
    expect(gateOut({ thr: -40, atk: 0.002, hold: 0.05, rel: 0.15, range: 0 }, 0.001)).toBe(0);
  });

  it('raises GATE OUT above threshold', () => {
    expect(gateOut({ thr: -40, atk: 0.002, hold: 0.05, rel: 0.15, range: -60 }, 5)).toBe(5);
  });
});
