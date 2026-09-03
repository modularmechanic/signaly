import { Base, ch, clamp, type Params } from '../../engine/dsp-prelude';

const SWEEP_OCT = 4; // full SENS range sweeps the cutoff +/-4 octaves

/** Envelope follower (asymmetric attack/release, like GATE's detector) drives a TPT
    state-variable lowpass's cutoff (the same topology as SVF). DIRECTION flips whether loud
    input opens the filter up or closes it down -- the two classic auto-wah personalities. */
class EnvFilt extends Base {
  env = 0;
  ic1 = 0;
  ic2 = 0;

  defaults(): Params {
    return { sens: 0.6, freq: 400, res: 0.3, atk: 0.01, rel: 0.15, mix: 1, dir: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0);
    const out = O[0]?.[0];
    if (!out) return true;
    const p = this.p;
    const dir = (p.dir ?? 0) > 0 ? -1 : 1;
    const sens = clamp(p.sens ?? 0.6, 0, 1);
    const base = clamp(p.freq ?? 400, 40, 8000);
    const res = clamp(p.res ?? 0.3, 0, 1);
    const mix = clamp(p.mix ?? 1, 0, 1);
    const atkC = 1 - Math.exp(-1 / (Math.max(0.0005, p.atk ?? 0.01) * sampleRate));
    const relC = 1 - Math.exp(-1 / (Math.max(0.005, p.rel ?? 0.15) * sampleRate));
    const k = 2 - 1.96 * res;
    for (let i = 0; i < out.length; i++) {
      const x = inp?.[i] ?? 0;
      const peak = Math.abs(x) / 5;
      this.env += (peak - this.env) * (peak > this.env ? atkC : relC);
      const fc = clamp(base * Math.pow(2, dir * sens * SWEEP_OCT * this.env), 20, sampleRate * 0.45);
      const g = Math.tan((Math.PI * fc) / sampleRate);
      const a1 = 1 / (1 + g * (g + k)),
        a2 = g * a1,
        a3 = g * a2;
      const v3 = x - this.ic2;
      const v1 = a1 * this.ic1 + a2 * v3;
      const v2 = this.ic2 + a2 * this.ic1 + a3 * v3;
      this.ic1 = 2 * v1 - this.ic1;
      this.ic2 = 2 * v2 - this.ic2;
      out[i] = clamp(x * (1 - mix) + v2 * mix, -5, 5);
    }
    return true;
  }
}

registerProcessor('envfilt', EnvFilt);
