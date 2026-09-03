import { Base, ch, clamp, type Params } from '../../engine/dsp-prelude';

class VCA extends Base {
  defaults(): Params {
    return { g1: 1, g2: 1, exp: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const a1 = ch(I, 0),
      c1 = ch(I, 1),
      a2 = ch(I, 2),
      c2 = ch(I, 3);
    const o1 = O[0]?.[0],
      o2 = O[1]?.[0];
    if (!o1 || !o2) return true;
    const p = this.p;
    const g1 = p.g1 ?? 1,
      g2 = p.g2 ?? 1,
      exp = p.exp ?? 0;
    for (let i = 0; i < o1.length; i++) {
      let g = c1 ? clamp((c1[i] ?? 0) / 5, 0, 1) : 1;
      let h = c2 ? clamp((c2[i] ?? 0) / 5, 0, 1) : 1;
      if (exp) {
        g *= g;
        h *= h;
      }
      o1[i] = (a1?.[i] ?? 0) * g * g1;
      o2[i] = (a2?.[i] ?? 0) * h * g2;
    }
    return true;
  }
}
registerProcessor('vca', VCA);
