import { describe, expect, it } from 'vitest';
import type { Params } from '../../engine/dsp-prelude';
import { loadProcessor } from '../../../tests/dsp-harness';
import type { Proc } from '../../../tests/dsp-harness';

/** One clock pulse per block; returns 1 for every step that fired TRIG. */
async function run(p: Params, steps: number): Promise<number[]> {
  const e = await loadProcessor('euklid', p);
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

const posted = (e: Proc): unknown[] => e.port.postMessage.mock.calls.map((c) => c[0]);

describe('euklid.dsp', () => {
  it('emits the canonical E(3,8) tresillo', async () => {
    expect(await run({ steps: 8, fill: 3, rot: 0, prob: 1, chaos: 0 }, 8)).toEqual([0, 0, 1, 0, 0, 1, 0, 1]);
  });

  it('emits the canonical E(5,8) and rotates it', async () => {
    expect(await run({ steps: 8, fill: 5, rot: 0, prob: 1, chaos: 0 }, 8)).toEqual([0, 1, 0, 1, 1, 0, 1, 1]);
    expect(await run({ steps: 8, fill: 5, rot: 1, prob: 1, chaos: 0 }, 8)).toEqual([1, 0, 1, 1, 0, 1, 1, 0]);
  });

  it('is silent at fill 0 and fully on at fill = steps', async () => {
    expect(await run({ steps: 8, fill: 0, rot: 0, prob: 1, chaos: 0 }, 8)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(await run({ steps: 8, fill: 8, rot: 0, prob: 1, chaos: 0 }, 8)).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
  });

  it('feeds the step display the index and the whole pattern', async () => {
    const e = await loadProcessor('euklid', { steps: 8, fill: 3, rot: 0, prob: 1, chaos: 0 });
    const clk = new Float32Array(128);
    clk.fill(5, 0, 64);
    const gap = new Float32Array(128);
    const O = Array.from({ length: 3 }, () => [new Float32Array(128)]);
    for (let s = 0; s < 3; s++) {
      e.process([[clk], [], [], []], O);
      e.process([[gap], [], [], []], O);
    }
    const msgs = posted(e) as { t: string; i: number; n: number; pattern: Uint8Array }[];
    expect(msgs.map((m) => m.i)).toEqual([0, 1, 2]);
    expect(msgs[0]!.t).toBe('step');
    expect(msgs[0]!.n).toBe(8);
    expect([...msgs[0]!.pattern]).toEqual([0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('redraws the pattern when FILL changes with the clock stopped', async () => {
    const e = await loadProcessor('euklid', { steps: 8, fill: 3, rot: 0, prob: 1, chaos: 0 });
    const gap = new Float32Array(128);
    const I: Float32Array[][] = [[gap], [], [], []];
    const O = Array.from({ length: 3 }, () => [new Float32Array(128)]);
    e.process(I, O);
    e.process(I, O);
    expect(e.port.postMessage).toHaveBeenCalledTimes(1);
    e.port.onmessage?.({ data: { t: 'p', id: 'fill', v: 5 } } as MessageEvent);
    e.process(I, O);
    expect(e.port.postMessage).toHaveBeenCalledTimes(2);
    const last = posted(e).at(-1) as { pattern: Uint8Array };
    expect([...last.pattern]).toEqual([0, 1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
});
