// True four-quadrant multiplier: Y is read as a bipolar carrier, so a negative Y
// inverts X — the thing the VCA cannot do. OFFSET adds a DC bias to the carrier,
// walking the sound from ring modulation (0) through AM (0.5) to untouched X (1).
// DEPTH blends dry X against the modulated result; 5 V of CV covers the whole range.
import { Base, ch, clamp, type Params } from '../../engine/dsp-prelude';

const MAX_V = 5;

class Ring extends Base {
  defaults(): Params {
    return { depth: 1, offset: 0, dcvamt: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const x = ch(I, 0),
      y = ch(I, 1),
      dcv = ch(I, 2);
    const out = O[0]?.[0];
    if (!out) return true;
    const { depth = 1, offset = 0 } = this.p;
    const off = clamp(offset, 0, 1);
    for (let i = 0; i < out.length; i++) {
      const xv = x?.[i] ?? 0;
      // carrier is +/-1 at OFFSET 0 and pinned to +1 at OFFSET 1
      const carrier = off + (1 - off) * ((y?.[i] ?? 0) / MAX_V);
      const d = clamp(depth + (dcv?.[i] ?? 0) / MAX_V, 0, 1);
      out[i] = clamp(xv + (xv * carrier - xv) * d, -MAX_V, MAX_V);
    }
    return true;
  }
}

registerProcessor('ring', Ring);
