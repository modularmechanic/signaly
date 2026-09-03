import { beforeAll, describe, expect, it, vi } from 'vitest';

const post = vi.fn();

class FakeProcessor {
  port = { onmessage: null as ((e: MessageEvent) => void) | null, postMessage: post };
}

interface Proc {
  port: { onmessage: ((e: MessageEvent) => void) | null };
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
}
type Ctor = new (o?: { processorOptions?: { p?: Record<string, number> } }) => Proc;

let Euklid: Ctor;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', 48000);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./euklid.dsp');
  Euklid = reg.mock.calls[0]![1] as Ctor;
});

/** One clock pulse per block; returns 1 for every step that fired TRIG. */
function run(p: Record<string, number>, steps: number): number[] {
  post.mockClear();
  const e = new Euklid({ processorOptions: { p } });
  const clk = new Float32Array(128);
  clk.fill(5, 0, 64);
  const gap = new Float32Array(128);
  const I: Float32Array[][] = [[clk], [], [], []];
  const O = Array.from({ length: 3 }, () => [new Float32Array(128)]);
  const fired: number[] = [];
  for (let s = 0; s < steps; s++) {
    e.process(I, O);
    fired.push((O[0]![0]![0] ?? 0) > 2.5 ? 1 : 0);
    I[0] = [gap];
    e.process(I, O);
    I[0] = [clk];
  }
  return fired;
}

describe('euklid.dsp', () => {
  it('emits the canonical E(3,8) tresillo', () => {
    expect(run({ steps: 8, fill: 3, rot: 0, prob: 1, chaos: 0 }, 8)).toEqual([0, 0, 1, 0, 0, 1, 0, 1]);
  });

  it('emits the canonical E(5,8) and rotates it', () => {
    expect(run({ steps: 8, fill: 5, rot: 0, prob: 1, chaos: 0 }, 8)).toEqual([0, 1, 0, 1, 1, 0, 1, 1]);
    expect(run({ steps: 8, fill: 5, rot: 1, prob: 1, chaos: 0 }, 8)).toEqual([1, 0, 1, 1, 0, 1, 1, 0]);
  });

  it('is silent at fill 0 and fully on at fill = steps', () => {
    expect(run({ steps: 8, fill: 0, rot: 0, prob: 1, chaos: 0 }, 8)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(run({ steps: 8, fill: 8, rot: 0, prob: 1, chaos: 0 }, 8)).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
  });

  it('feeds the step display the index and the whole pattern', () => {
    run({ steps: 8, fill: 3, rot: 0, prob: 1, chaos: 0 }, 3);
    const msgs = post.mock.calls.map((c) => c[0] as { t: string; i: number; n: number; pattern: Uint8Array });
    expect(msgs.map((m) => m.i)).toEqual([0, 1, 2]);
    expect(msgs[0]!.t).toBe('step');
    expect(msgs[0]!.n).toBe(8);
    expect([...msgs[0]!.pattern]).toEqual([0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('redraws the pattern when FILL changes with the clock stopped', () => {
    post.mockClear();
    const e = new Euklid({ processorOptions: { p: { steps: 8, fill: 3, rot: 0, prob: 1, chaos: 0 } } });
    const gap = new Float32Array(128);
    const I: Float32Array[][] = [[gap], [], [], []];
    const O = Array.from({ length: 3 }, () => [new Float32Array(128)]);
    e.process(I, O);
    e.process(I, O);
    expect(post).toHaveBeenCalledTimes(1);
    e.port.onmessage?.({ data: { t: 'p', id: 'fill', v: 5 } } as MessageEvent);
    e.process(I, O);
    expect(post).toHaveBeenCalledTimes(2);
    const last = post.mock.calls.at(-1)![0] as { pattern: Uint8Array };
    expect([...last.pattern]).toEqual([0, 1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
});
