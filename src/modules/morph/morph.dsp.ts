import { Base, ch, clamp, flush, type Params } from '../../engine/dsp-prelude';

// Same TPT topology as SVF, but the three taps are crossfaded rather than jacked
// separately: one knob (and one CV) sweeps LP -> BP -> HP without a click.
class Morph extends Base {
  ic1 = 0;
  ic2 = 0;

  defaults(): Params {
    return { cut: 1000, res: 0.25, shape: 0, shapeA: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      cv = ch(I, 1),
      scv = ch(I, 2);
    const out = O[0]?.[0];
    if (!out) return true;
    const { cut = 1000, res = 0.25, shape = 0 } = this.p;
    const k = 2 - 1.96 * clamp(res, 0, 1);
    for (let i = 0; i < out.length; i++) {
      const x = inp?.[i] ?? 0;
      const fc = clamp(cut * Math.pow(2, cv?.[i] ?? 0), 15, sampleRate * 0.45);
      const g = Math.tan((Math.PI * fc) / sampleRate);
      const a1 = 1 / (1 + g * (g + k)),
        a2 = g * a1,
        a3 = g * a2;
      const v3 = x - this.ic2;
      const v1 = a1 * this.ic1 + a2 * v3;
      const v2 = this.ic2 + a2 * this.ic1 + a3 * v3;
      this.ic1 = flush(2 * v1 - this.ic1);
      this.ic2 = flush(2 * v2 - this.ic2);
      const hp = x - k * v1 - v2;
      const s = clamp(shape + (scv?.[i] ?? 0) / 5, 0, 1) * 2;
      out[i] = clamp(s < 1 ? v2 + (v1 - v2) * s : v1 + (hp - v1) * (s - 1), -5, 5);
    }
    return true;
  }
}

registerProcessor('morph', Morph);
