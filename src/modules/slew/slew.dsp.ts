// Two independent slew limiters: the output chases its input at a fixed volts-per-second,
// separately for rising and falling. RISE/FALL are the time to travel 5 V, matching FUNKTION.
// LINK 1>2 makes channel 1's two times drive both channels (stereo or dual-mono portamento).
import { Base, ch, clamp, flush, type Params } from '../../engine/dsp-prelude';

const SPAN = 5; // volts a full RISE/FALL time traverses
const T_MIN = 0.001;

class Slew extends Base {
  y1 = 0;
  y2 = 0;

  defaults(): Params {
    return { r1: 0.05, f1: 0.05, r2: 0.2, f2: 0.2, link: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const a = ch(I, 0),
      b = ch(I, 1);
    const o1 = O[0]?.[0],
      o2 = O[1]?.[0];
    if (!o1 || !o2) return true;
    const { r1 = 0.05, f1 = 0.05, r2 = 0.2, f2 = 0.2, link = 0 } = this.p;
    const step = (t: number): number => SPAN / (Math.max(T_MIN, t) * sampleRate);
    const ru1 = step(r1),
      fd1 = step(f1);
    const ru2 = link >= 0.5 ? ru1 : step(r2),
      fd2 = link >= 0.5 ? fd1 : step(f2);
    for (let i = 0; i < o1.length; i++) {
      const t1 = clamp(a?.[i] ?? 0, -SPAN, SPAN);
      const t2 = clamp(b?.[i] ?? 0, -SPAN, SPAN);
      this.y1 = flush(this.y1 < t1 ? Math.min(t1, this.y1 + ru1) : Math.max(t1, this.y1 - fd1));
      this.y2 = flush(this.y2 < t2 ? Math.min(t2, this.y2 + ru2) : Math.max(t2, this.y2 - fd2));
      o1[i] = this.y1;
      o2[i] = this.y2;
    }
    return true;
  }
}

registerProcessor('slew', Slew);
