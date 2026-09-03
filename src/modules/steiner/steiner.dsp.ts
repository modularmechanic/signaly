import { Base, ch, clamp, TP, type Params } from '../../engine/dsp-prelude';

// RBJ cookbook biquad coefficients, recomputed at block rate: a closed-form coefficient set
// per mode rather than the analog-modelled integrator core the rest of the filter bank shares
// (SVF, WASP, MORPH all tap one running core). MODE selects which coefficient set the same
// cutoff and Q feed into, so the four responses come from four different equations, not four
// taps of one.
class Steiner extends Base {
  x1 = 0;
  x2 = 0;
  y1 = 0;
  y2 = 0;

  defaults(): Params {
    return { cut: 800, res: 0.3, cvA: 0, mode: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      cv = ch(I, 1);
    const out = O[0]?.[0];
    if (!out) return true;
    const { cut = 800, res = 0.3, mode = 0 } = this.p;
    const f0 = clamp(cut * Math.pow(2, cv?.[0] ?? 0), 20, sampleRate * 0.45);
    const w0 = (TP * f0) / sampleRate;
    const q = 0.55 + clamp(res, 0, 1) * 9;
    const alpha = Math.sin(w0) / (2 * q);
    const cosw = Math.cos(w0);
    const m = clamp(mode, 0, 3) | 0;
    let b0: number, b1: number, b2: number;
    if (m === 0) {
      b0 = (1 - cosw) / 2;
      b1 = 1 - cosw;
      b2 = (1 - cosw) / 2;
    } else if (m === 1) {
      b0 = alpha;
      b1 = 0;
      b2 = -alpha;
    } else if (m === 2) {
      b0 = (1 + cosw) / 2;
      b1 = -(1 + cosw);
      b2 = (1 + cosw) / 2;
    } else {
      b0 = 1 - alpha;
      b1 = -2 * cosw;
      b2 = 1 + alpha;
    }
    const a0 = 1 + alpha,
      a1 = -2 * cosw,
      a2 = 1 - alpha;
    const nb0 = b0 / a0,
      nb1 = b1 / a0,
      nb2 = b2 / a0,
      na1 = a1 / a0,
      na2 = a2 / a0;
    for (let i = 0; i < out.length; i++) {
      const x = inp?.[i] ?? 0;
      const y = nb0 * x + nb1 * this.x1 + nb2 * this.x2 - na1 * this.y1 - na2 * this.y2;
      this.x2 = this.x1;
      this.x1 = x;
      this.y2 = this.y1;
      this.y1 = y;
      out[i] = clamp(y, -5, 5);
    }
    return true;
  }
}

registerProcessor('steiner', Steiner);
