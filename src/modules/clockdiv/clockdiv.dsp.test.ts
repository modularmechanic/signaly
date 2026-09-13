import { describe, expect, it } from 'vitest';
import { loadProcessor } from '../../../tests/dsp-harness';
import type { Proc } from '../../../tests/dsp-harness';

/** Run `blocks` of 128 samples with a 50% duty clock of `period` samples. */
function run(c: Proc, blocks: number, period: number): void {
  const O = [[new Float32Array(128)]];
  for (let b = 0; b < blocks; b++) {
    const clk = new Float32Array(128);
    for (let i = 0; i < 128; i++) clk[i] = (b * 128 + i) % period < period / 2 ? 5 : 0;
    c.process([[clk]], O);
  }
}

describe('clockdiv.dsp', () => {
  it('posts an edge-triggered led message and never repeats a value', async () => {
    const c = await loadProcessor('clockdiv', { div: 2 });
    run(c, 200, 4000);
    const led = c.port.postMessage.mock.calls.map(([m]) => m as { t: string; id: string; v: number });
    expect(led.length).toBeGreaterThan(2);
    expect(led.every((m) => m.t === 'led' && m.id === 'clk')).toBe(true);
    expect(led.map((m) => m.v)).toEqual(led.map((_, i) => (i % 2 === 0 ? 1 : 0)));
  });

  it('stays dark with no clock patched', async () => {
    const c = await loadProcessor('clockdiv');
    const O = [[new Float32Array(128)]];
    for (let b = 0; b < 50; b++) c.process([], O);
    expect(c.port.postMessage).not.toHaveBeenCalled();
  });
});
