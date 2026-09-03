import { Base, ch, clamp, flush, TP, type Params } from '../../engine/dsp-prelude';

/** e^-6.9078 = 0.001, so `r^(dec * sr)` is exactly -60 dB: DECAY is a real T60. */
const T60 = 6.907755;
const PEAKS = 3;

// Three two-pole resonators, peak-gain normalised so a tone at the tuned frequency
// passes at unity and a STRIKE rings at a predictable level.
class Reson extends Base {
  y1 = [0, 0, 0];
  y2 = [0, 0, 0];
  lg = 0;
  imp = 0;

  defaults(): Params {
    return { freq: 220, spread: 7, dec: 0.8, cvA: 0, mix: 1 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      cv = ch(I, 1),
      st = ch(I, 2);
    const out = O[0]?.[0];
    if (!out) return true;
    const { freq = 220, spread = 7, dec = 0.8, mix = 1 } = this.p;
    // Six trig calls a sample would dominate the block; the tuning follows CV at block rate.
    const base = clamp(freq * Math.pow(2, cv?.[0] ?? 0), 20, sampleRate * 0.45);
    const r = Math.exp(-T60 / (clamp(dec, 0.005, 20) * sampleRate));
    const rr = r * r;
    const c: number[] = [];
    const a0: number[] = [];
    for (let k = 0; k < PEAKS; k++) {
      const w = (TP * clamp(base * Math.pow(2, (spread * k) / 12), 20, sampleRate * 0.45)) / sampleRate;
      c.push(2 * r * Math.cos(w));
      a0.push((1 - rr) * Math.sin(w));
    }
    // a strike is an impulse scaled so the ring peaks near 4 V whatever the decay
    const hit = 4 / Math.max(1e-6, 1 - rr);
    for (let i = 0; i < out.length; i++) {
      const g = st?.[i] ?? 0;
      if (g > 2.5 && this.lg <= 2.5) this.imp = hit;
      this.lg = g;
      const x = (inp?.[i] ?? 0) + this.imp;
      this.imp = 0;
      let sum = 0;
      for (let k = 0; k < PEAKS; k++) {
        const y = (a0[k] ?? 0) * x + (c[k] ?? 0) * (this.y1[k] ?? 0) - rr * (this.y2[k] ?? 0);
        this.y2[k] = this.y1[k] ?? 0;
        this.y1[k] = flush(y);
        sum += y;
      }
      out[i] = clamp((inp?.[i] ?? 0) * (1 - mix) + (sum / 1.8) * mix, -5, 5);
    }
    return true;
  }
}

registerProcessor('reson', Reson);
