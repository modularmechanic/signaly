// Voltage-controlled crossfade between A and B, then a pan of the result.
// Both laws are constant power (sin/cos quadrant), so gA^2 + gB^2 = 1 all the way
// across: a sweep holds its loudness instead of dipping like a linear fade does.
// 5 V of CV covers the whole sweep; the attenuverters live on the jacks, not here.
import { Base, ch, clamp, type Params } from '../../engine/dsp-prelude';

const Q = Math.PI / 2; // quarter turn: the whole fade sits in one quadrant
const MAX_V = 5;

class Xfade extends Base {
  defaults(): Params {
    return { fade: 0.5, fcvamt: 0, pan: 0, pcvamt: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const a = ch(I, 0),
      b = ch(I, 1),
      fcv = ch(I, 2),
      pcv = ch(I, 3);
    const l = O[0]?.[0],
      r = O[1]?.[0];
    if (!l || !r) return true;
    const { fade = 0.5, pan = 0 } = this.p;
    for (let i = 0; i < l.length; i++) {
      const f = clamp(fade + (fcv?.[i] ?? 0) / MAX_V, 0, 1);
      const th = f * Q;
      const mix = (a?.[i] ?? 0) * Math.cos(th) + (b?.[i] ?? 0) * Math.sin(th);
      const ph = (clamp(pan + (pcv?.[i] ?? 0) / MAX_V, -1, 1) + 1) * (Q / 2);
      l[i] = clamp(mix * Math.cos(ph), -MAX_V, MAX_V);
      r[i] = clamp(mix * Math.sin(ph), -MAX_V, MAX_V);
    }
    return true;
  }
}

registerProcessor('xfade', Xfade);
