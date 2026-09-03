import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Params } from '../../engine/dsp-prelude';

const SR = 48000;
const N = 128;

class FakeProcessor {
  port = { onmessage: null as ((e: MessageEvent) => void) | null, postMessage: (): void => {} };
}

interface Proc {
  p: Params;
  port: { onmessage: ((e: MessageEvent) => void) | null; postMessage: (m: unknown) => void };
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
}
let Ctor: new () => Proc;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', SR);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./mix8.dsp');
  Ctor = reg.mock.calls[0]?.[1] as new () => Proc;
});

/** The real param path: the main thread only ever posts `{t:'p'}`. */
const send = (d: Proc, id: string, v: number): void =>
  d.port.onmessage?.({ data: { t: 'p', id, v } } as MessageEvent);

/** 12 inputs (8 channels + 2 stereo returns); an absent key stays unpatched. */
const makeIns = (patch: Record<number, Float32Array>): Float32Array[][] =>
  Array.from({ length: 12 }, (_, i) => (patch[i] ? [patch[i] as Float32Array] : []));

const makeOuts = (): Float32Array[][] => Array.from({ length: 6 }, () => [new Float32Array(N)]);

/** 1500 Hz: exactly 4 cycles per 128-sample block, so a repeated block is a continuous sine. */
const F = 1500;
const tone = (amp = 1): Float32Array => {
  const b = new Float32Array(N);
  for (let i = 0; i < N; i++) b[i] = amp * Math.sin((2 * Math.PI * F * i) / SR);
  return b;
};

const peak = (b: Float32Array | undefined): number => {
  let m = 0;
  for (const v of b ?? []) m = Math.max(m, Math.abs(v));
  return m;
};

/** Unity gain, dead centre, unmuted, flat EQ. */
function unity(): Proc {
  const d = new Ctor();
  d.p.master = 1;
  for (let c = 1; c <= 8; c++) {
    d.p[`l${c}`] = 1;
    d.p[`p${c}`] = 0;
    d.p[`m${c}`] = 0;
    d.p[`s${c}`] = 0;
  }
  return d;
}

/** Run enough blocks for the biquads to settle, then return the main-out peak. */
function settled(d: Proc, ins: Record<number, Float32Array>, blocks = 6): { l: number; r: number } {
  const O = makeOuts();
  for (let b = 0; b < blocks; b++) d.process(makeIns(ins), O);
  return { l: peak(O[4]?.[0]), r: peak(O[5]?.[0]) };
}

describe('mix8.dsp', () => {
  it('passes a channel at unity to both outputs', () => {
    const d = unity();
    const { l, r } = settled(d, { 0: tone(5) }, 1);
    expect(l).toBeGreaterThan(3.4); // centre pan is cos(π/4) ≈ 0.707 a side
    expect(r).toBeGreaterThan(3.4);
  });

  it('mutes a channel', () => {
    const d = unity();
    send(d, 'm1', 1);
    expect(settled(d, { 0: tone(5) }, 1).l).toBe(0);
  });

  it('solo is exclusive: a soloed channel silences every other one', () => {
    const d = unity();
    d.p.p1 = -1; // ch 1 hard left
    d.p.p2 = 1; // ch 2 hard right
    send(d, 's2', 1);
    const { l, r } = settled(d, { 0: tone(5), 1: tone(5) }, 1);
    expect(l).toBeLessThan(1e-6); // ch 1 is not soloed, so it is gone (cos(π/2) leaks 6e-17)
    expect(r).toBeGreaterThan(4.9); // ch 2 still plays
  });

  it('pans hard left', () => {
    const d = unity();
    d.p.p1 = -1;
    const { l, r } = settled(d, { 0: tone(5) }, 1);
    expect(l).toBeGreaterThan(4.9);
    expect(r).toBeLessThan(1e-6);
  });

  it('is transparent with every EQ band at 0 dB', () => {
    const d = unity();
    d.p.p1 = -1; // hard left keeps the comparison 1:1 with the input
    const x = tone(4);
    const O = makeOuts();
    d.process(makeIns({ 0: x }), O);
    d.process(makeIns({ 0: x }), O);
    const out = O[4]?.[0] as Float32Array;
    let worst = 0;
    for (let i = 0; i < N; i++) worst = Math.max(worst, Math.abs((out[i] ?? 0) - (x[i] ?? 0)));
    expect(worst).toBeLessThan(1e-4);
  });

  it('keeps one EQ per channel: a mid boost on channel 2 leaves channel 1 flat', () => {
    const d = unity();
    d.p.p1 = -1;
    d.p.p2 = -1;
    send(d, 'mf2', F); // put channel 2's mid band right on the test tone
    send(d, 'mid2', 12);
    const x = tone(2);
    const one = settled(d, { 0: x }).l;
    const two = settled(unity(), { 1: x }).l;
    const dd = unity();
    dd.p.p2 = -1;
    send(dd, 'mf2', F);
    send(dd, 'mid2', 12);
    const boosted = settled(dd, { 1: x }).l;
    expect(Math.abs(one - peak(x))).toBeLessThan(1e-3); // channel 1 untouched
    expect(boosted).toBeGreaterThan(two * 3); // +12 dB is ×3.98
  });

  it('re-bakes the mid band when its frequency knob moves', () => {
    const d = unity();
    d.p.p1 = -1;
    send(d, 'mid1', 12);
    send(d, 'mf1', 300); // boost is far below the 1500 Hz tone: little effect
    const away = settled(d, { 0: tone(2) }).l;
    send(d, 'mf1', F); // now centred on it
    const on = settled(d, { 0: tone(2) }).l;
    expect(on).toBeGreaterThan(away * 2);
  });

  it('sends nothing until a channel send is opened', () => {
    const d = unity();
    d.p.p1 = -1;
    const O = makeOuts();
    d.process(makeIns({ 0: tone(5) }), O);
    expect(peak(O[0]?.[0])).toBe(0); // send 1 silent
    expect(peak(O[2]?.[0])).toBe(0); // send 2 silent
    expect(peak(O[4]?.[0])).toBeGreaterThan(4.9); // the dry mix is unaffected
  });

  it('feeds a send post-fader at the channel send level', () => {
    const d = unity();
    d.p.p1 = -1; // hard left, so send 1 L carries the whole channel
    d.p.l1 = 0.5; // fader at half: square-law taper gives 0.25
    d.p.snd1_1 = 0.5;
    const O = makeOuts();
    d.process(makeIns({ 0: tone(4) }), O);
    // 4 V × 0.25 (fader) × 0.5 (send) = 0.5 V on send 1 L, nothing on send 2
    expect(peak(O[0]?.[0])).toBeGreaterThan(0.49);
    expect(peak(O[0]?.[0])).toBeLessThan(0.51);
    expect(peak(O[2]?.[0])).toBe(0);
  });

  it('adds a return to the dry mix at the return level instead of replacing it', () => {
    const d = unity();
    d.p.p1 = -1;
    d.p.ret1 = 0.5;
    const ret = new Float32Array(N).fill(2);
    const O = makeOuts();
    d.process(makeIns({ 0: tone(5), 8: ret, 9: ret }), O);
    // dry 5 V peak on L plus 2 V × 0.5 return — the dry signal survives the patched return
    expect(peak(O[4]?.[0])).toBeGreaterThan(5.9);
    expect(peak(O[4]?.[0])).toBeLessThan(6.1);
    // R has no dry (panned hard left) so it shows the return alone
    expect(peak(O[5]?.[0])).toBeGreaterThan(0.99);
    expect(peak(O[5]?.[0])).toBeLessThan(1.01);
  });

  it('stays finite at extreme settings', () => {
    const d = unity();
    for (let c = 1; c <= 8; c++) {
      send(d, `lo${c}`, 15);
      send(d, `mid${c}`, 15);
      send(d, `mf${c}`, c % 2 ? 200 : 5000);
      send(d, `hi${c}`, -15);
      d.p[`snd1_${c}`] = 1;
      d.p[`snd2_${c}`] = 1;
    }
    const ins: Record<number, Float32Array> = {};
    for (let c = 0; c < 8; c++) ins[c] = tone(5);
    const O = makeOuts();
    for (let b = 0; b < 20; b++) d.process(makeIns(ins), O);
    for (const o of O) for (const v of o[0] ?? []) expect(Number.isFinite(v)).toBe(true);
    expect(peak(O[4]?.[0])).toBeLessThanOrEqual(10);
  });
});
