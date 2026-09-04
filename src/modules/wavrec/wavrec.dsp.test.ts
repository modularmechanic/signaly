import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Params } from '../../engine/dsp-prelude';

const SR = 48000;
const N = 128;

class FakeProcessor {
  port = { onmessage: null, postMessage: vi.fn() };
}

interface Proc {
  p: Params;
  port: { postMessage: ReturnType<typeof vi.fn> };
  msg(m: { t: string }): void;
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
}
let WavRec: new () => Proc;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', SR);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./wavrec.dsp');
  WavRec = reg.mock.calls[0]![1] as new () => Proc;
});

const outs = (): Float32Array[][] => [[new Float32Array(N)], [new Float32Array(N)]];
const ramp = (v: number): Float32Array => new Float32Array(N).fill(v);
/** Every interleaved PCM sample posted so far, in order. */
const pcm = (d: Proc): number[] =>
  d.port.postMessage.mock.calls
    .map(([m]) => m as { t: string; v?: Float32Array })
    .filter((m) => m.t === 'pcm')
    .flatMap((m) => Array.from(m.v ?? []));

describe('wavrec.dsp', () => {
  it('passes stereo through untouched whether or not it is recording', () => {
    const d = new WavRec();
    const O = outs();
    d.process([[ramp(2)], [ramp(-3)]], O);
    expect(O[0]![0]![0]).toBe(2);
    expect(O[1]![0]![0]).toBe(-3);
  });

  it('records nothing until it is armed', () => {
    const d = new WavRec();
    for (let i = 0; i < 40; i++) d.process([[ramp(5)], [ramp(5)]], outs());
    expect(pcm(d)).toHaveLength(0);
  });

  it('scales the rack’s ±5 V to the ±1 a file wants', () => {
    const d = new WavRec();
    d.p.rec = 1;
    // 4096 frames fill one chunk; 32 blocks of 128 is exactly that.
    for (let i = 0; i < 32; i++) d.process([[ramp(5)], [ramp(-5)]], outs());
    const s = pcm(d);
    expect(s.length).toBe(8192);
    expect(s[0]).toBeCloseTo(1, 6);
    expect(s[1]).toBeCloseTo(-1, 6);
  });

  it('interleaves left and right, and records a mono source into both channels', () => {
    const d = new WavRec();
    d.p.rec = 1;
    for (let i = 0; i < 32; i++) d.process([[ramp(5)], []], outs());
    const s = pcm(d);
    expect(s[0]).toBeCloseTo(1, 6);
    expect(s[1]).toBeCloseTo(1, 6); // right follows left rather than recording silence
  });

  it('applies REC LEVEL', () => {
    const d = new WavRec();
    d.p.rec = 1;
    d.p.gain = 0.5;
    for (let i = 0; i < 32; i++) d.process([[ramp(5)], [ramp(5)]], outs());
    expect(pcm(d)[0]).toBeCloseTo(0.5, 6);
  });

  it('flushes the tail when recording stops, losing no samples', () => {
    const d = new WavRec();
    d.p.rec = 1;
    d.process([[ramp(1)], [ramp(1)]], outs()); // 128 frames — far short of a full chunk
    expect(pcm(d)).toHaveLength(0);
    d.p.rec = 0;
    d.process([[ramp(1)], [ramp(1)]], outs());
    expect(pcm(d)).toHaveLength(256); // 128 frames, two channels
  });

  /** The last status line the processor published. */
  const line = (d: Proc): string | undefined =>
    d.port.postMessage.mock.calls
      .map(([m]) => m as { t: string; v?: string })
      .filter((m) => m.t === 'text')
      .pop()?.v;

  it('says STOP as soon as recording stops, even mid-second', () => {
    const d = new WavRec();
    d.p.rec = 1;
    d.process([[ramp(1)], [ramp(1)]], outs());
    expect(line(d)).toBe('REC 0:00');
    d.p.rec = 0;
    d.process([[ramp(1)], [ramp(1)]], outs());
    // Keying the readout on the second alone left a stopped take still reading REC.
    expect(line(d)).toBe('STOP 0:00');
  });

  it('erase clears the processor’s own counter, not just the main thread’s copy', () => {
    const d = new WavRec();
    d.p.rec = 1;
    for (let i = 0; i < SR / N; i++) d.process([[ramp(1)], [ramp(1)]], outs());
    expect(line(d)).toBe('REC 0:01');
    d.p.rec = 0;
    d.process([[ramp(1)], [ramp(1)]], outs());
    d.msg({ t: 'erase' });
    d.process([[ramp(0)], [ramp(0)]], outs());
    expect(line(d)).toBe('READY 0:00');
  });

  it('reports the elapsed time', () => {
    const d = new WavRec();
    d.p.rec = 1;
    for (let i = 0; i < SR / N; i++) d.process([[ramp(1)], [ramp(1)]], outs());
    const text = d.port.postMessage.mock.calls
      .map(([m]) => m as { t: string; v?: string })
      .filter((m) => m.t === 'text')
      .pop();
    expect(text?.v).toBe('REC 0:01');
  });
});
