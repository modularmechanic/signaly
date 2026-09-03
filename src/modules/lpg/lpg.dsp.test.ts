import { beforeAll, describe, expect, it, vi } from 'vitest';

class FakeProcessor {
  port: { onmessage: ((e: MessageEvent) => void) | null } = { onmessage: null };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
  p: Record<string, number>;
}
let Lpg: new () => Proc;

const SR = 48000;
const N = SR * 2;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', SR);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./lpg.dsp');
  Lpg = reg.mock.calls[0]![1] as new () => Proc;
});

/** Ping the gate once at sample 10 and return the output for `inp`. */
function ping(inp: Float32Array, resp: number, mode: number, colour = 1): Float32Array {
  const g = new Lpg();
  g.p.resp = resp;
  g.p.mode = mode;
  g.p.colour = colour;
  const pg = new Float32Array(inp.length);
  for (let i = 10; i < 60; i++) pg[i] = 5;
  const O = [[new Float32Array(inp.length)]];
  g.process([[inp], [], [pg]], O);
  return O[0]![0]!;
}

const dc = (n: number): Float32Array => new Float32Array(n).fill(5);

/** Samples until the envelope falls to a tenth of its peak. */
function decaySamples(resp: number): number {
  const y = ping(dc(N), resp, 1);
  let peak = 0;
  for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(y[i]!));
  for (let i = 0; i < N; i++) if (Math.abs(y[i]!) > peak * 0.9) return findFall(y, i, peak * 0.1);
  return -1;
}

function findFall(y: Float32Array, from: number, level: number): number {
  for (let i = from; i < y.length; i++) if (Math.abs(y[i]!) < level) return i - from;
  return y.length;
}

/** 6 kHz over 200 Hz in the window starting at `from` — how bright the output is. */
function brightness(y: Float32Array, from: number): number {
  const amp = (hz: number): number => {
    let re = 0,
      im = 0;
    for (let i = from; i < from + 960; i++) {
      const a = (2 * Math.PI * hz * i) / SR;
      re += y[i]! * Math.cos(a);
      im += y[i]! * Math.sin(a);
    }
    return Math.sqrt(re * re + im * im);
  };
  return amp(6000) / Math.max(1e-9, amp(200));
}

describe('lpg.dsp', () => {
  it('a ping decays exponentially over a time RESPONSE sets', () => {
    const quick = decaySamples(0.05);
    const slow = decaySamples(0.5);
    expect(quick).toBeGreaterThan(100);
    expect(slow / quick).toBeGreaterThan(8);
    expect(slow / quick).toBeLessThan(12);
  });

  it('couples brightness to amplitude in LPG mode but not in VCA mode', () => {
    const tone = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      tone[i] = 2.5 * Math.sin((2 * Math.PI * 200 * i) / SR) + 2.5 * Math.sin((2 * Math.PI * 6000 * i) / SR);
    }
    const lpg = ping(tone, 0.5, 0);
    const vca = ping(tone, 0.5, 1);
    expect(brightness(lpg, 2000)).toBeGreaterThan(brightness(lpg, SR * 0.6) * 3);
    expect(brightness(vca, 2000)).toBeCloseTo(brightness(vca, SR * 0.6), 1);
  });
});
