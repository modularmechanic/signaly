import { Base, ch, clamp, flush, lpCoeff, type Params } from '../../engine/dsp-prelude';

/** HALF passes only the positive half; FULL folds both halves up, which cancels the
    fundamental and leaves the octave above dominant — the classic full-wave "ring"
    character. Both go through a DC block: rectifying a sine has a nonzero average. */
class Rectify extends Base {
  dc = 0;
  dcA = lpCoeff(6);

  defaults(): Params {
    return { drive: 1, level: 0.8, mix: 1, mode: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      dcv = ch(I, 1);
    const out = O[0]?.[0];
    if (!out) return true;
    const p = this.p;
    const half = (p.mode ?? 0) < 0.5;
    const level = clamp(p.level ?? 0.8, 0, 1.4);
    const mix = clamp(p.mix ?? 1, 0, 1);
    for (let i = 0; i < out.length; i++) {
      const drive = clamp((p.drive ?? 1) * Math.pow(2, (dcv?.[i] ?? 0) / 5), 0.2, 15);
      const raw = inp?.[i] ?? 0;
      const u = (raw / 5) * drive;
      let w = half ? Math.max(u, 0) : Math.abs(u);
      this.dc = flush(this.dc + (w - this.dc) * this.dcA);
      w -= this.dc;
      out[i] = clamp(w * 5 * level * mix + raw * (1 - mix), -5, 5);
    }
    return true;
  }
}
registerProcessor('rectify', Rectify);
