import { beforeAll, describe, expect, it, vi } from 'vitest';

class FakeProcessor {
  port: { onmessage: ((e: MessageEvent) => void) | null } = { onmessage: null };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
  p: Record<string, number>;
}
let Lofi: new () => Proc;

const SR = 48000;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', SR);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./lofi.dsp');
  Lofi = reg.mock.calls[0]![1] as new () => Proc;
});

/** RMS of the second half of an 8 kHz tone at the given BANDWIDTH. */
function hfEnergy(bw: number): number {
  const m = new Lofi();
  m.p.bw = bw;
  m.p.wow = 0;
  m.p.hiss = 0;
  m.p.crackle = 0;
  m.p.mix = 1;
  const n = 4800;
  const inp = new Float32Array(n);
  for (let i = 0; i < n; i++) inp[i] = Math.sin((2 * Math.PI * 8000 * i) / SR) * 4;
  const O = [[new Float32Array(n)]];
  m.process([[inp]], O);
  const y = O[0]![0]!;
  let sum = 0;
  for (let i = n / 2; i < n; i++) sum += y[i]! * y[i]!;
  return Math.sqrt(sum / (n / 2));
}

/** RMS of the whole output for silent input at the given HISS. */
function noiseFloor(hiss: number): number {
  const m = new Lofi();
  m.p.hiss = hiss;
  m.p.wow = 0;
  m.p.crackle = 0;
  m.p.bw = 18000;
  m.p.mix = 1;
  const n = 4800;
  const inp = new Float32Array(n);
  const O = [[new Float32Array(n)]];
  m.process([[inp]], O);
  const y = O[0]![0]!;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += y[i]! * y[i]!;
  return Math.sqrt(sum / n);
}

describe('lofi.dsp', () => {
  it('passes fully dry input through unchanged at mix 0', () => {
    const m = new Lofi();
    m.p.mix = 0;
    m.p.hiss = 1;
    m.p.wow = 1;
    m.p.crackle = 1;
    m.p.bw = 300;
    const inp = new Float32Array([1, -2, 3, -4, 0.5]);
    const O = [[new Float32Array(5)]];
    m.process([[inp]], O);
    expect(Array.from(O[0]![0]!)).toEqual(Array.from(inp));
  });

  it('narrows bandwidth and adds a hiss noise floor', () => {
    expect(hfEnergy(18000)).toBeGreaterThan(hfEnergy(400) * 2);
    expect(noiseFloor(0.8)).toBeGreaterThan(noiseFloor(0) + 0.1);
  });
});
