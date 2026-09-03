// Boolean combination of two gates. THRESHOLD is the voltage at which an input counts
// as high, so audio or CV can be squared up into logic as well as real gates.
// All four results come out at once — this is a utility, not a mode switch.
import { Base, ch, type Params } from '../../engine/dsp-prelude';

const HI = 5;

class Logic extends Base {
  la = -1;
  lb = -1;

  defaults(): Params {
    return { thr: 2.5 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const ia = ch(I, 0),
      ib = ch(I, 1);
    const and = O[0]?.[0],
      or = O[1]?.[0],
      xor = O[2]?.[0],
      nota = O[3]?.[0];
    if (!and || !or || !xor || !nota) return true;
    const thr = this.p.thr ?? 2.5;
    let a = false,
      b = false;
    for (let i = 0; i < and.length; i++) {
      a = (ia?.[i] ?? 0) >= thr;
      b = (ib?.[i] ?? 0) >= thr;
      and[i] = a && b ? HI : 0;
      or[i] = a || b ? HI : 0;
      xor[i] = a !== b ? HI : 0;
      nota[i] = a ? 0 : HI;
    }
    const va = a ? 1 : 0,
      vb = b ? 1 : 0;
    if (va !== this.la) {
      this.la = va;
      this.port.postMessage({ t: 'led', id: 'a', v: va });
    }
    if (vb !== this.lb) {
      this.lb = vb;
      this.port.postMessage({ t: 'led', id: 'b', v: vb });
    }
    return true;
  }
}

registerProcessor('logic', Logic);
