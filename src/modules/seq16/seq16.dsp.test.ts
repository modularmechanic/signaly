import { beforeAll, describe, expect, it, vi } from 'vitest';

class FakeProcessor {
  port = { onmessage: null as ((e: MessageEvent) => void) | null, postMessage: vi.fn() };
}

interface Proc {
  port: { postMessage: ReturnType<typeof vi.fn> };
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
}
type Ctor = new (o?: { processorOptions?: { p?: Record<string, number> } }) => Proc;

let Seq16: Ctor;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', 48000);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./seq16.dsp');
  Seq16 = reg.mock.calls[0]![1] as Ctor;
});

/** One clock pulse per call (high block then low block); returns the step indices posted. */
function clock(s: Proc, n: number): number[] {
  const hi = new Float32Array(8).fill(5);
  const lo = new Float32Array(8);
  const O = [[new Float32Array(8)], [new Float32Array(8)]];
  const posted: number[] = [];
  for (let k = 0; k < n; k++) {
    s.process([[hi], []], O);
    s.process([[lo], []], O);
  }
  for (const call of (s.port.postMessage as ReturnType<typeof vi.fn>).mock.calls) {
    const msg = call[0] as { t: string; i: number };
    if (msg.t === 'step') posted.push(msg.i);
  }
  return posted;
}

describe('seq16.dsp', () => {
  it('advances 16 steps then wraps, and RESET returns to step 1', () => {
    const s = new Seq16();
    const steps = clock(s, 16);
    // step starts at 0 (step 1); 16 clocks advance it 1..15 then wrap back to 0.
    expect(steps).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0]);

    // Advance a few more steps away from 0, then RESET must land back on step 1 (index 0).
    (s.port.postMessage as ReturnType<typeof vi.fn>).mockClear();
    clock(s, 5); // step is now 5
    const O = [[new Float32Array(8)], [new Float32Array(8)]];
    const rstHi = new Float32Array(8).fill(5);
    const rstLo = new Float32Array(8);
    s.process([[new Float32Array(8)], [rstHi]], O);
    s.process([[new Float32Array(8)], [rstLo]], O);
    const posted = (s.port.postMessage as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => c[0] as { t: string; i: number })
      .filter((m) => m.t === 'step');
    expect(posted.at(-1)?.i).toBe(0);
  });
});
