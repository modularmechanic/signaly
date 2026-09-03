import { Base, ch, clamp, flush, TP, type Params } from '../../engine/dsp-prelude';

interface Coeff {
  b0: number;
  a1: number;
  a2: number;
}

const bpCoeff = (f0: number, q: number): Coeff => {
  const w0 = (TP * f0) / sampleRate;
  const alpha = Math.sin(w0) / (2 * q);
  const a0 = 1 + alpha;
  return { b0: alpha / a0, a1: (-2 * Math.cos(w0)) / a0, a2: (1 - alpha) / a0 };
};

// Two independent constant-peak-gain bandpasses running in parallel, tuned SPREAD semitones
// apart around FREQ and blended by MIX — unlike RESON's three struck, decaying resonators,
// these continuously filter the audio input, so widening SPREAD pulls two measurable peaks
// apart rather than shaping one excited ring.
class DualBp extends Base {
  x11 = 0;
  x12 = 0;
  y11 = 0;
  y12 = 0;
  x21 = 0;
  x22 = 0;
  y21 = 0;
  y22 = 0;

  defaults(): Params {
    return { freq: 300, spread: 24, res: 0.5, cvA: 0, mix: 0.5 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      cv = ch(I, 1);
    const out = O[0]?.[0];
    if (!out) return true;
    const { freq = 300, spread = 24, res = 0.5, mix = 0.5 } = this.p;
    // FREQ CV is block-rate on purpose, same reason as STEINER: direct-form biquads, not the
    // per-sample integrator core.
    const center = clamp(freq * Math.pow(2, cv?.[0] ?? 0), 20, sampleRate * 0.45);
    const q = 2 + clamp(res, 0, 1) * 10;
    const f1 = clamp(center / Math.pow(2, spread / 24), 20, sampleRate * 0.45);
    const f2 = clamp(center * Math.pow(2, spread / 24), 20, sampleRate * 0.45);
    const c1 = bpCoeff(f1, q);
    const c2 = bpCoeff(f2, q);
    for (let i = 0; i < out.length; i++) {
      const x = inp?.[i] ?? 0;
      const ya = c1.b0 * (x - this.x12) - c1.a1 * this.y11 - c1.a2 * this.y12;
      this.x12 = this.x11;
      this.x11 = x;
      this.y12 = this.y11;
      this.y11 = flush(ya);
      const yb = c2.b0 * (x - this.x22) - c2.a1 * this.y21 - c2.a2 * this.y22;
      this.x22 = this.x21;
      this.x21 = x;
      this.y22 = this.y21;
      this.y21 = flush(yb);
      out[i] = clamp(ya * (1 - mix) + yb * mix, -5, 5);
    }
    return true;
  }
}

registerProcessor('dualbp', DualBp);
