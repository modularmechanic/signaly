import { Base, ch, clamp, flush, TP, type Params } from '../../engine/dsp-prelude';

const CENTERS = [100, 200, 400, 800, 1600, 3200, 6400, 12800];
const Q = 5;
const N = CENTERS.length;

interface Coeff {
  b0: number;
  a1: number;
  a2: number;
}

// Eight fixed bandpass filters, tuned once at construction and never retuned by any knob —
// the classic graphic filter bank. Every other filter in the batch sweeps one cutoff; this one
// is eight parallel bands at fixed centres, and the FADERS set each band's level, so the
// character comes from the mix of bands, not from a swept frequency.
class FixedBank extends Base {
  coeffs: Coeff[] = CENTERS.map((f0) => {
    const w0 = (TP * f0) / sampleRate;
    const alpha = Math.sin(w0) / (2 * Q);
    const a0 = 1 + alpha;
    return { b0: alpha / a0, a1: (-2 * Math.cos(w0)) / a0, a2: (1 - alpha) / a0 };
  });
  x1 = new Float64Array(N);
  x2 = new Float64Array(N);
  y1 = new Float64Array(N);
  y2 = new Float64Array(N);

  defaults(): Params {
    const p: Params = {};
    for (let i = 0; i < N; i++) p[`b${i + 1}`] = 0.7;
    return p;
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0);
    const out = O[0]?.[0];
    if (!out) return true;
    for (let i = 0; i < out.length; i++) {
      const x = inp?.[i] ?? 0;
      let sum = 0;
      for (let b = 0; b < N; b++) {
        const c = this.coeffs[b]!;
        const px1 = this.x1[b] ?? 0,
          px2 = this.x2[b] ?? 0,
          py1 = this.y1[b] ?? 0,
          py2 = this.y2[b] ?? 0;
        // constant peak gain bandpass: b1 is always 0, so only b0 (on x - x2) needs a term
        const y = c.b0 * (x - px2) - c.a1 * py1 - c.a2 * py2;
        this.x2[b] = px1;
        this.x1[b] = x;
        this.y2[b] = py1;
        this.y1[b] = flush(y);
        sum += y * (this.p[`b${b + 1}`] ?? 0);
      }
      out[i] = clamp(sum * 0.6, -5, 5);
    }
    return true;
  }
}

registerProcessor('fixedbank', FixedBank);
