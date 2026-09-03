import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { InMsg, Params } from './dsp-prelude';

class FakeProcessor {
  port: { onmessage: ((e: MessageEvent) => void) | null } = { onmessage: null };
}

type Prelude = typeof import('./dsp-prelude');
let P: Prelude;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', 48000);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  P = await import('./dsp-prelude');
});

describe('dsp-prelude', () => {
  it('flushes subnormal tails to exact zero', () => {
    expect(P.flush(1e-20)).toBe(0);
    expect(P.flush(-1e-20)).toBe(0);
    expect(P.flush(NaN)).toBe(0);
    expect(P.flush(0.25)).toBe(0.25);
  });

  it('reads a patched input channel and null otherwise', () => {
    const buf = new Float32Array(4);
    expect(P.ch([[buf]], 0)).toBe(buf);
    expect(P.ch([], 0)).toBeNull();
    expect(P.ch([[new Float32Array(0)]], 0)).toBeNull();
  });

  it('delays by whole and fractional samples', () => {
    const dl = new P.DL(8);
    for (const v of [1, 2, 3, 4]) dl.push(v);
    expect(dl.read(0)).toBeCloseTo(4);
    expect(dl.read(1)).toBeCloseTo(3);
    expect(dl.read(0.5)).toBeCloseTo(3.5);
  });

  it('derives one-pole coefficients from the live sample rate', () => {
    expect(P.onePoleCoeff(0)).toBe(1);
    const a = P.onePoleCoeff(10);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(1);
    const smoother = new P.OnePole(1, 0);
    expect(smoother.process(1)).toBeGreaterThan(0);
  });

  it('locks a clock period on rising edges above 2.5V', () => {
    const cs = new P.ClockSync();
    for (let i = 0; i < 200; i++) cs.tick(i % 100 === 0 ? 5 : 0);
    expect(cs.period).toBeGreaterThan(0);
    expect(P.SYNC_DIV[0]).toBe(0);
  });

  it('runs a full-period Lcg: in range, low bits alive, no short cycle', () => {
    const rng = new P.Lcg(12345);
    const seen = new Set<number>();
    const low = new Set<number>();
    let repeat = -1;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < 200000; i++) {
      const v = rng.next();
      if (v < min) min = v;
      if (v > max) max = v;
      if (seen.has(rng.s)) {
        repeat = i;
        break;
      }
      seen.add(rng.s);
      low.add(rng.s & 15);
    }
    // Range is asserted once over the extremes, not twice per draw: 400 000 expect() calls cost
    // seconds and timed this test out on CI while passing locally.
    expect(min).toBeGreaterThanOrEqual(-1);
    expect(max).toBeLessThanOrEqual(1);
    expect(repeat).toBe(-1);
    expect(low.size).toBeGreaterThan(1);
  });

  it('routes {t:p} port messages to params and everything else to msg()', () => {
    class Proc extends P.Base {
      seen: InMsg[] = [];
      override defaults(): Params {
        return { a: 1 };
      }
      override msg(m: InMsg): void {
        this.seen.push(m);
      }
    }
    const proc = new Proc();
    const send = (data: unknown): void => proc.port.onmessage?.({ data } as MessageEvent);

    expect(proc.p.a).toBe(1);
    send({ t: 'p', id: 'a', v: 7 });
    expect(proc.p.a).toBe(7);
    send({ t: 'p', id: 'a', v: Number.NaN });
    expect(proc.p.a).toBe(7);
    send('nope');
    send({ t: 'seed', data: [1] });
    expect(proc.seen).toHaveLength(2);
  });
});
