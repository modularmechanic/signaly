import { describe, expect, it } from 'vitest';
import type { Proc } from '../../../tests/dsp-harness';
import { loadProcessor, SR } from '../../../tests/dsp-harness';

type Cloud = Proc & { head: number; msg(m: { t: string; v?: unknown }): void };

function sample(): Float32Array {
  return new Float32Array(SR * 2).fill(1); // constant, so a grain's presence is unambiguous
}

/** Fraction of samples that are near-silent once voices have had time to fill up. */
async function quietFraction(dens: number, size: number): Promise<number> {
  const c = (await loadProcessor('cloud')) as Cloud;
  c.msg({ t: 'sample', v: sample() });
  c.p.dens = dens;
  c.p.size = size;
  c.p.spray = 0;
  c.p.pos = 0.3;
  const n = SR / 2;
  const O = [[new Float32Array(n)], [new Float32Array(n)]];
  c.process([[], []], O);
  const y = O[0]![0]!;
  let quiet = 0;
  for (let i = n / 4; i < n; i++) if (Math.abs(y[i]!) < 0.05) quiet++;
  return quiet / (n - n / 4);
}

describe('cloud.dsp', () => {
  it('overlaps grains as density rises: near-silence between onsets nearly disappears', async () => {
    const sparse = await quietFraction(2, 0.005); // short grains, far apart
    const dense = await quietFraction(40, 0.1); // long grains, close together — genuine overlap
    expect(sparse).toBeGreaterThan(0.3);
    expect(dense).toBeLessThan(0.1);
  });

  it('freeze holds the scan head; unfrozen, it advances', async () => {
    const frozen = (await loadProcessor('cloud')) as Cloud;
    frozen.msg({ t: 'sample', v: sample() });
    frozen.p.freeze = 1;
    const before = frozen.head;
    const O = [[new Float32Array(4800)], [new Float32Array(4800)]];
    frozen.process([[], []], O);
    expect(frozen.head).toBe(before);

    const running = (await loadProcessor('cloud')) as Cloud;
    running.msg({ t: 'sample', v: sample() });
    running.p.freeze = 0;
    const start = running.head;
    const O2 = [[new Float32Array(4800)], [new Float32Array(4800)]];
    running.process([[], []], O2);
    expect(running.head).not.toBe(start);
  });
});
