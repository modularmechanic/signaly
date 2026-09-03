import { Base, blep, ch, clamp, type Params } from '../../engine/dsp-prelude';

/** Detune of each voice as a fraction of the maximum spread; index 3 is the centre. */
const SPREAD = [-1, -0.62, -0.28, 0, 0.28, 0.62, 1];
/** Cents at DETUNE = 1. */
const MAX_CENTS = 45;
/** Left-channel weight per side voice — the six sides alternate across the stereo field. */
const PAN_L = [1, 0.35, 1, 0.35, 1, 0.35];

class Super extends Base {
  ph = [0, 0.13, 0.29, 0.41, 0.57, 0.71, 0.87];

  defaults(): Params {
    return { tune: 0, det: 0.3, mix: 0.5, detA: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const vo = ch(I, 0),
      dcv = ch(I, 1);
    const l = O[0]?.[0],
      r = O[1]?.[0];
    if (!l || !r) return true;
    const { tune = 0, det = 0.3, mix = 0.5 } = this.p;
    for (let i = 0; i < l.length; i++) {
      const f = clamp(261.626 * Math.pow(2, tune + (vo?.[i] ?? 0)), 0.05, sampleRate * 0.4);
      const d = clamp(det + (dcv?.[i] ?? 0) / 5, 0, 1) * MAX_CENTS;
      let centre = 0,
        sl = 0,
        sr = 0,
        side = 0;
      for (let v = 0; v < 7; v++) {
        const dt = (f * Math.pow(2, ((SPREAD[v] ?? 0) * d) / 1200)) / sampleRate;
        let t = (this.ph[v] ?? 0) + dt;
        if (t >= 1) t -= 1;
        this.ph[v] = t;
        const saw = 2 * t - 1 - blep(t, dt);
        if (v === 3) {
          centre = saw;
        } else {
          const w = PAN_L[side] ?? 1;
          sl += saw * w;
          sr += saw * (1.35 - w);
          side++;
        }
      }
      const c = centre * (1 - mix) * 0.9;
      l[i] = clamp(c + (sl * mix) / 3, -1, 1) * 5;
      r[i] = clamp(c + (sr * mix) / 3, -1, 1) * 5;
    }
    return true;
  }
}

registerProcessor('super', Super);
