import { Base, ch, clamp, flush, lpCoeff, type Params } from '../../engine/dsp-prelude';

// Two stages, and unlike LADDER (one tanh at the input feeding four clean linear stages) or
// DIODE (an asymmetric per-stage shaper), every op-amp integrator here saturates its own
// running output — the Polivoks's crude, unstable character comes from that stacked clipping,
// not from a single input drive stage.
class Polivoks extends Base {
  s1 = 0;
  s2 = 0;

  defaults(): Params {
    return { cut: 1000, res: 0.3, drive: 1, cvA: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      cv = ch(I, 1);
    const out = O[0]?.[0];
    if (!out) return true;
    const { cut = 1000, res = 0.3, drive = 1 } = this.p;
    const norm = Math.max(1, drive * 0.6);
    const k = 3.6 * clamp(res, 0, 1);
    for (let i = 0; i < out.length; i++) {
      const fc = clamp(cut * Math.pow(2, cv?.[i] ?? 0), 20, sampleRate * 0.4);
      const g = lpCoeff(fc);
      const x = ((inp?.[i] ?? 0) / 5) * drive;
      const u = x - k * this.s2; // resonance feeds back from the final integrator
      this.s1 = flush(this.s1 + g * (Math.tanh(u) - this.s1));
      this.s2 = flush(this.s2 + g * (Math.tanh(this.s1) - this.s2));
      out[i] = clamp((this.s2 * 5) / norm, -5, 5);
    }
    return true;
  }
}

registerProcessor('polivoks', Polivoks);
