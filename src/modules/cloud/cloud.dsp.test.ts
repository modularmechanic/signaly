import { beforeAll, describe, expect, it, vi } from 'vitest';

class FakeProcessor {
  port: { onmessage: ((e: MessageEvent) => void) | null; postMessage: () => void } = {
    onmessage: null,
    postMessage: () => {},
  };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
  p: Record<string, number>;
  head: number;
  msg(m: { t: string; v?: unknown }): void;
}
let Cloud: new () => Proc;

const SR = 48000;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', SR);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./cloud.dsp');
  Cloud = reg.mock.calls[0]![1] as new () => Proc;
});

function sample(): Float32Array {
  return new Float32Array(SR * 2).fill(1); // constant, so a grain's presence is unambiguous
}

/** Fraction of samples that are near-silent once voices have had time to fill up. */
function quietFraction(dens: number, size: number): number {
  const c = new Cloud();
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
  it('overlaps grains as density rises: near-silence between onsets nearly disappears', () => {
    const sparse = quietFraction(2, 0.005); // short grains, far apart
    const dense = quietFraction(40, 0.1); // long grains, close together — genuine overlap
    expect(sparse).toBeGreaterThan(0.3);
    expect(dense).toBeLessThan(0.1);
  });

  it('freeze holds the scan head; unfrozen, it advances', () => {
    const frozen = new Cloud();
    frozen.msg({ t: 'sample', v: sample() });
    frozen.p.freeze = 1;
    const before = frozen.head;
    const O = [[new Float32Array(4800)], [new Float32Array(4800)]];
    frozen.process([[], []], O);
    expect(frozen.head).toBe(before);

    const running = new Cloud();
    running.msg({ t: 'sample', v: sample() });
    running.p.freeze = 0;
    const start = running.head;
    const O2 = [[new Float32Array(4800)], [new Float32Array(4800)]];
    running.process([[], []], O2);
    expect(running.head).not.toBe(start);
  });
});
