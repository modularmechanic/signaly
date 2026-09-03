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
  }
  return d;
}

describe('mix8.dsp', () => {
  it('passes a channel at unity to both outputs', () => {
    const d = unity();
    const O = makeOuts();
    d.process(makeIns({ 0: tone(5) }), O);
    // equal-power centre: 5V in -> 5 * cos(pi/4) on each leg
    expect(peak(O[4]?.[0])).toBeGreaterThan(3.4);
    expect(peak(O[4]?.[0])).toBeLessThan(3.6);
    expect(peak(O[5]?.[0])).toBeGreaterThan(3.4);
  });

  it('mutes a channel', () => {
    const d = unity();
    d.p.m1 = 1;
    const O = makeOuts();
    d.process(makeIns({ 0: tone(5) }), O);
    expect(peak(O[4]?.[0])).toBe(0);
    expect(peak(O[5]?.[0])).toBe(0);
  });

  it('pans hard left', () => {
    const d = unity();
    d.p.p1 = -1;
    const O = makeOuts();
    d.process(makeIns({ 0: tone(5) }), O);
    expect(peak(O[4]?.[0])).toBeGreaterThan(4.9);
    expect(peak(O[5]?.[0])).toBeLessThan(1e-6);
  });

  it('is transparent with every EQ band at 0 dB', () => {
    const d = unity();
    d.p.p1 = -1; // hard left keeps the comparison 1:1 with the input
    const x = tone(4);
    const O = makeOuts();
    d.process(makeIns({ 0: x }), O);
    d.process(makeIns({ 0: x }), O);
    const out = O[4]?.[0] as Float32Array;
    for (let i = 0; i < N; i++) expect(Math.abs((out[i] ?? 0) - (x[i] ?? 0))).toBeLessThan(1e-4);
  });

  it('keeps one EQ state per channel behind the SEL switch', () => {
    const d = unity();
    d.p.p1 = -1;
    d.p.p2 = -1;
    send(d, 'sel', 1); // edit channel 2
    send(d, 'eq2f', F);
    send(d, 'eq2g', -18);
    send(d, 'eq2q', 2);
    const x = tone(4);
    const O = makeOuts();
    d.process(makeIns({ 0: x }), O);
    d.process(makeIns({ 0: x }), O);
    // channel 1 was never selected, so its EQ is still flat
    for (let i = 0; i < N; i++) expect(Math.abs((O[4]?.[0]?.[i] ?? 0) - (x[i] ?? 0))).toBeLessThan(1e-4);
    const P = makeOuts();
    for (let b = 0; b < 6; b++) d.process(makeIns({ 1: x }), P);
    expect(peak(P[4]?.[0])).toBeLessThan(peak(x) * 0.6); // channel 2 got the -18 dB cut
  });

  it('dumps the selected channel EQ back to the panel', () => {
    const d = unity();
    const seen: { t?: string; ch?: number; v?: number[] }[] = [];
    d.port.postMessage = (m: unknown): void => void seen.push(m as { t?: string });
    send(d, 'sel', 3);
    expect(seen).toHaveLength(1);
    expect(seen[0]?.t).toBe('eqdump');
    expect(seen[0]?.ch).toBe(3);
    expect(seen[0]?.v).toHaveLength(12);
  });

  it('bypasses an insert whose return is unpatched', () => {
    const d = unity();
    d.p.p1 = -1;
    const O = makeOuts();
    d.process(makeIns({ 0: tone(5) }), O);
    expect(peak(O[0]?.[0])).toBeGreaterThan(4.9); // send 1 carries the bus
    expect(peak(O[2]?.[0])).toBeGreaterThan(4.9); // send 2 sees it unchanged
    expect(peak(O[4]?.[0])).toBeGreaterThan(4.9); // and the master is not muted
  });

  it('takes the bus from a patched return', () => {
    const d = unity();
    const ret = new Float32Array(N).fill(2);
    const O = makeOuts();
    d.process(makeIns({ 0: tone(5), 8: ret, 9: ret }), O);
    expect(peak(O[4]?.[0])).toBeGreaterThan(1.9);
    expect(peak(O[4]?.[0])).toBeLessThan(2.1);
  });

  it('stays finite at extreme settings', () => {
    const d = unity();
    for (let c = 1; c <= 8; c++) {
      d.p[`p${c}`] = c % 2 ? -1 : 1;
      send(d, 'sel', c - 1);
      for (let b = 1; b <= 4; b++) {
        send(d, `eq${b}f`, b === 1 ? 20 : 18000);
        send(d, `eq${b}g`, 18);
        send(d, `eq${b}q`, 0.3);
      }
    }
    const loud = new Float32Array(N).fill(5);
    const I = makeIns(Object.fromEntries(Array.from({ length: 8 }, (_, i) => [i, loud])));
    const O = makeOuts();
    for (let b = 0; b < 20; b++) d.process(I, O);
    for (const o of O) for (const v of o[0] ?? []) expect(Number.isFinite(v)).toBe(true);
    expect(peak(O[4]?.[0])).toBeLessThanOrEqual(10);
  });
});
