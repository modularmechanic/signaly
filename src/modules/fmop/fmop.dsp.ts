import { Base, ch, clamp, TP, type Params } from '../../engine/dsp-prelude';

/** The knob is continuous; the operator only ever runs on a musical ratio. */
const RATIOS = [0.25, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8];

function snap(r: number): number {
  let best = RATIOS[0]!;
  for (const c of RATIOS) if (Math.abs(c - r) < Math.abs(best - r)) best = c;
  return best;
}

// Modulator -> carrier phase. Index 0 leaves a pure sine; index up grows the
// sideband pairs at carrier +- n * modulator.
class FmOp extends Base {
  cph = 0;
  mph = 0;
  mz = 0;
  ls = 0;

  defaults(): Params {
    return { tune: 0, ratio: 1, index: 0, idxA: 0, fb: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const vo = ch(I, 0),
      icv = ch(I, 1),
      sy = ch(I, 2);
    const out = O[0]?.[0];
    if (!out) return true;
    const { tune = 0, ratio = 1, index = 0, fb = 0 } = this.p;
    const rat = snap(clamp(ratio, 0.25, 8));
    for (let i = 0; i < out.length; i++) {
      const f = clamp(261.626 * Math.pow(2, tune + (vo?.[i] ?? 0)), 0.05, sampleRate * 0.45);
      const s = sy?.[i] ?? 0;
      if (s > 2.5 && this.ls <= 2.5) {
        this.cph = 0;
        this.mph = 0;
      }
      this.ls = s;
      this.cph += f / sampleRate;
      if (this.cph >= 1) this.cph -= 1;
      this.mph += (f * rat) / sampleRate;
      if (this.mph >= 1) this.mph -= 1;
      const idx = clamp(index + (icv?.[i] ?? 0) * 2, 0, 20);
      const m = Math.sin(TP * this.mph + fb * Math.PI * this.mz);
      this.mz = m;
      out[i] = Math.sin(TP * this.cph + idx * m) * 5;
    }
    return true;
  }
}

registerProcessor('fmop', FmOp);
