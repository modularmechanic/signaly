// Window comparator. GATE is high while IN sits inside CENTRE +/- WIDTH/2; ABOVE and
// BELOW cover the two sides, so exactly one of the three outputs is high at any sample.
// CENTRE CV arrives already scaled by its attenuverter (a GainNode on the jack).
import { Base, ch, clamp, type Params } from '../../engine/dsp-prelude';

const HI = 5;

class Compare extends Base {
  led = -1;

  defaults(): Params {
    return { centre: 0, width: 2, ccvamt: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const x = ch(I, 0),
      cv = ch(I, 1);
    const gate = O[0]?.[0],
      above = O[1]?.[0],
      below = O[2]?.[0];
    if (!gate || !above || !below) return true;
    const { centre = 0, width = 2 } = this.p;
    const half = Math.max(0, width) / 2;
    let inWin = false;
    for (let i = 0; i < gate.length; i++) {
      const c = clamp(centre + (cv?.[i] ?? 0), -HI, HI);
      const v = x?.[i] ?? 0;
      const hiEdge = v > c + half;
      const loEdge = v < c - half;
      inWin = !hiEdge && !loEdge;
      gate[i] = inWin ? HI : 0;
      above[i] = hiEdge ? HI : 0;
      below[i] = loEdge ? HI : 0;
    }
    const lv = inWin ? 1 : 0;
    if (lv !== this.led) {
      this.led = lv;
      this.port.postMessage({ t: 'led', id: 'win', v: lv });
    }
    return true;
  }
}

registerProcessor('compare', Compare);
