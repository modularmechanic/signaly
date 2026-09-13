import { describe, expect, it } from 'vitest';
import type { Proc } from '../../../tests/dsp-harness';
import { loadProcessor } from '../../../tests/dsp-harness';

describe('trigseq.dsp', () => {
  it('realigns lanes of length 3 and 4 every 12 clocks (their LCM)', async () => {
    const t = (await loadProcessor('trigseq', { len1: 3, len2: 4, len3: 16, len4: 16 })) as Proc & {
      msg?(m: { t: string; [k: string]: unknown }): void;
    };
    // Only step 0 of lane 1 and lane 2 is hit, so both fire together exactly when both
    // lanes are back at position 0 — every LCM(3,4) = 12 clocks.
    const grid = [[1, 0, 0], [1, 0, 0, 0], [0], [0]];
    t.msg?.({ t: 'grid', v: grid });
    const hi = new Float32Array(4).fill(5);
    const lo = new Float32Array(4);
    const O = Array.from({ length: 4 }, () => [new Float32Array(4)]);
    const bothFireAt: number[] = [];
    for (let clock = 1; clock <= 24; clock++) {
      t.process([[hi], []], O);
      const l1 = (O[0]?.[0]?.[3] ?? 0) > 2.5;
      const l2 = (O[1]?.[0]?.[3] ?? 0) > 2.5;
      if (l1 && l2) bothFireAt.push(clock);
      t.process([[lo], []], O);
    }
    expect(bothFireAt).toEqual([12, 24]);
  });
});
