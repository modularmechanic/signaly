import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Params } from '../../engine/dsp-prelude';

const SR = 48000;
const N = 2048;

class FakeProcessor {
  port = { onmessage: null as ((e: MessageEvent) => void) | null, postMessage: vi.fn() };
}

interface Proc {
  p: Params;
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
}
let Ctor: new () => Proc;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', SR);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./spread.dsp');
  Ctor = reg.mock.calls[0]?.[1] as new () => Proc;
});

/** A stereo pair: 4 kHz in the mid, 4 kHz in anti-phase for the side. */
function stereo(sideHz = 4000): [Float32Array, Float32Array] {
  const l = new Float32Array(N);
  const r = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const mid = 2 * Math.sin((2 * Math.PI * 1000 * i) / SR);
    const side = 1.5 * Math.sin((2 * Math.PI * sideHz * i) / SR);
    l[i] = mid + side;
    r[i] = mid - side;
  }
  return [l, r];
}

function run(o: Partial<Params>, sideHz = 4000): [Float32Array, Float32Array, Float32Array, Float32Array] {
  const s = new Ctor();
  Object.assign(s.p, { width: 1, bass: 20, mix: 1 }, o);
  const [l, r] = stereo(sideHz);
  const oL = new Float32Array(N);
  const oR = new Float32Array(N);
  s.process([[l], [r], []], [[oL], [oR]]);
  return [oL, oR, l, r];
}

/** Peak absolute difference over the settled second half of the block. */
function worst(a: Float32Array, b: Float32Array): number {
  let d = 0;
  for (let i = N / 2; i < N; i++) d = Math.max(d, Math.abs((a[i] ?? 0) - (b[i] ?? 0)));
  return d;
}

describe('spread.dsp', () => {
  it('passes both channels through untouched at MIX 0', () => {
    const [oL, oR, l, r] = run({ mix: 0, width: 0, bass: 400 });
    expect(worst(oL, l)).toBe(0);
    expect(worst(oR, r)).toBe(0);
  });

  it('collapses to identical L and R at width 0', () => {
    const [oL, oR] = run({ width: 0 });
    expect(worst(oL, oR)).toBeLessThan(1e-6);
  });

  it('preserves the input at width 1', () => {
    const [oL, oR, l, r] = run({ width: 1 });
    // 4 kHz side against a 20 Hz bass-mono corner: a fraction of a percent leaks to centre.
    expect(worst(oL, l)).toBeLessThan(0.02);
    expect(worst(oR, r)).toBeLessThan(0.02);
  });

  it('leaves L+R untouched at every width — the mono-compatibility identity', () => {
    const [, , l, r] = run({ width: 1 });
    for (const width of [0, 0.5, 1, 2]) {
      const [oL, oR] = run({ width });
      let d = 0;
      for (let i = N / 2; i < N; i++) {
        d = Math.max(d, Math.abs((oL[i] ?? 0) + (oR[i] ?? 0) - ((l[i] ?? 0) + (r[i] ?? 0))));
      }
      expect(d).toBeLessThan(1e-5);
    }
  });

  it('BASS MONO pulls low side content to the centre', () => {
    const wide = run({ width: 1, bass: 20 }, 40);
    const mono = run({ width: 1, bass: 400 }, 40);
    expect(worst(mono[0], mono[1])).toBeLessThan(worst(wide[0], wide[1]) * 0.3);
  });
});
