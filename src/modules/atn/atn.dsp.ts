import { Base, ch, type Params } from '../../engine/dsp-prelude';

class Atn extends Base {
  defaults(): Params {
    return { a1: 1, o1: 0, a2: 1, o2: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const i1 = ch(I, 0),
      i2 = ch(I, 1);
    const out1 = O[0]?.[0],
      out2 = O[1]?.[0];
    if (!out1 || !out2) return true;
    const { a1 = 1, o1 = 0, a2 = 1, o2 = 0 } = this.p;
    for (let i = 0; i < out1.length; i++) {
      out1[i] = (i1?.[i] ?? 0) * a1 + o1 * 5;
      out2[i] = (i2?.[i] ?? 0) * a2 + o2 * 5;
    }
    return true;
  }
}

registerProcessor('atn', Atn);
