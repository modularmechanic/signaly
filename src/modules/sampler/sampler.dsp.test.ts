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
  msg(m: { t: string; v?: unknown }): void;
}
let Sampler: new () => Proc;

const SR = 48000;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', SR);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./sampler.dsp');
  Sampler = reg.mock.calls[0]![1] as new () => Proc;
});

const RAMP_LEN = 1000;

/** A ramp that never touches 0, so "silence" unambiguously means "stopped playing". */
function ramp(): Float32Array {
  const buf = new Float32Array(RAMP_LEN);
  for (let i = 0; i < RAMP_LEN; i++) buf[i] = 0.2 + 0.8 * (i / RAMP_LEN);
  return buf;
}

/** Samples elapsed before playback falls silent (one-shot, no loop). */
function samplesToFinish(pitchSemis: number): number {
  const s = new Sampler();
  s.msg({ t: 'sample', v: ramp() });
  s.p.pitch = pitchSemis;
  s.p.start = 0;
  s.p.end = 1;
  s.p.loop = 0;
  const total = RAMP_LEN * 4;
  const trig = new Float32Array(total);
  trig[0] = 5; // rising edge on the very first sample
  const O = [[new Float32Array(total)]];
  s.process([[trig]], O);
  const y = O[0]![0]!;
  for (let i = 1; i < total; i++) if (y[i] === 0 && y[i - 1] !== 0) return i;
  return total;
}

describe('sampler.dsp', () => {
  it('tracks 1V/oct — +12 semitones plays the buffer twice as fast', () => {
    const base = samplesToFinish(0);
    const up = samplesToFinish(12);
    expect(base).toBeGreaterThan(RAMP_LEN * 0.8);
    const ratio = base / up;
    expect(ratio).toBeGreaterThan(1.9);
    expect(ratio).toBeLessThan(2.1);
  });

  it('confines playback to START..END and REVERSE starts from the far edge', () => {
    const s = new Sampler();
    s.msg({ t: 'sample', v: ramp() });
    s.p.start = 0.5;
    s.p.end = 1;
    s.p.reverse = 1;
    const total = 8;
    const trig = new Float32Array(total);
    trig[0] = 5;
    const O = [[new Float32Array(total)]];
    s.process([[trig]], O);
    // reverse from END (1.0 -> value ~1.0*5) must start near the loud end, not near START (0.5 -> ~3)
    expect(O[0]![0]![0]!).toBeGreaterThan(4.5);
  });

  it('keeps looping past the natural end when LOOP is on', () => {
    const s = new Sampler();
    s.msg({ t: 'sample', v: ramp() });
    s.p.loop = 1;
    const total = RAMP_LEN * 3;
    const trig = new Float32Array(total);
    trig[0] = 5;
    const O = [[new Float32Array(total)]];
    s.process([[trig]], O);
    const y = O[0]![0]!;
    let silentTail = 0;
    for (let i = total - 100; i < total; i++) if (y[i] === 0) silentTail++;
    expect(silentTail).toBe(0);
  });
});
