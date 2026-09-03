import { beforeAll, describe, expect, it, vi } from 'vitest';

class FakeProcessor {
  port: { onmessage: ((e: MessageEvent) => void) | null } = { onmessage: null };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
  p: Record<string, number>;
}
let SVF: new () => Proc;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', 48000);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./svf.dsp');
  SVF = reg.mock.calls[0]![1] as new () => Proc;
});

/** RMS of the LP output for a 2 kHz sine at the given cutoff. */
function lpEnergy(cut: number): number {
  const f = new SVF();
  f.p.cut = cut;
  const n = 4800;
  const inp = new Float32Array(n);
  for (let i = 0; i < n; i++) inp[i] = Math.sin((2 * Math.PI * 2000 * i) / 48000) * 5;
  const O = [[new Float32Array(n)], [new Float32Array(n)], [new Float32Array(n)]];
  f.process([[inp]], O);
  let sum = 0;
  const lp = O[0]![0]!;
  for (let i = n / 2; i < n; i++) sum += lp[i]! * lp[i]!;
  return Math.sqrt(sum / (n / 2));
}

describe('svf.dsp', () => {
  it('passes more energy as the cutoff sweeps up past the tone', () => {
    const low = lpEnergy(100);
    const mid = lpEnergy(2000);
    const high = lpEnergy(12000);
    expect(low).toBeLessThan(mid);
    expect(mid).toBeLessThan(high);
    expect(high).toBeGreaterThan(2);
  });

  it('stays finite at maximum resonance', () => {
    const f = new SVF();
    f.p.res = 1;
    f.p.cut = 16000;
    const inp = new Float32Array(1024).fill(5);
    const O = [[new Float32Array(1024)], [new Float32Array(1024)], [new Float32Array(1024)]];
    f.process([[inp]], O);
    for (const s of O[0]![0]!) expect(Number.isFinite(s)).toBe(true);
  });
});
