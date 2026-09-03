// Attack/decay envelope. No sustain: a trigger runs ATTACK then DECAY and stops,
// or restarts immediately in LOOP, which turns it into a shape-controllable LFO.
// CURVE bends both stages from linear (0) to exponential (1) through one exponent.
import { Base, ch, clamp, type Params } from '../../engine/dsp-prelude';

const EOC_S = 0.005; // end-of-cycle pulse width, seconds
const MAX_CURVE = 3; // exponent added on top of linear at CURVE = 1
const T_MIN = 0.0002; // shortest stage after CV, seconds
const T_MAX = 20;

// stages: 0 idle · 1 attack · 2 decay
class AD extends Base {
  ph = 0;
  st = 0;
  lt = 0;
  eoc = 0;
  led = -1;

  defaults(): Params {
    return { a: 0.01, d: 0.3, curve: 0.5, loop: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const tr = ch(I, 0),
      acv = ch(I, 1),
      dcv = ch(I, 2);
    const out = O[0]?.[0],
      eo = O[1]?.[0];
    if (!out || !eo) return true;
    const { a = 0.01, d = 0.3, curve = 0.5, loop = 0 } = this.p;
    const shape = 1 + clamp(curve, 0, 1) * MAX_CURVE;
    const eocLen = EOC_S * sampleRate;
    let e = 0;
    for (let i = 0; i < out.length; i++) {
      const t = tr?.[i] ?? 0;
      if (t > 2.5 && this.lt <= 2.5) {
        this.st = 1;
        this.ph = 0;
      }
      this.lt = t;
      // Stage-time CV is exponential: one volt doubles the time.
      const at = clamp(a * Math.pow(2, acv?.[i] ?? 0), T_MIN, T_MAX);
      const dt = clamp(d * Math.pow(2, dcv?.[i] ?? 0), T_MIN, T_MAX);
      if (this.st === 1) {
        this.ph += 1 / (at * sampleRate);
        if (this.ph >= 1) {
          this.ph = 0;
          this.st = 2;
        }
      } else if (this.st === 2) {
        this.ph += 1 / (dt * sampleRate);
        if (this.ph >= 1) {
          this.ph = 0;
          this.eoc = eocLen;
          this.st = loop >= 0.5 ? 1 : 0;
        }
      }
      e = this.st === 1 ? Math.pow(this.ph, shape) : this.st === 2 ? Math.pow(1 - this.ph, shape) : 0;
      out[i] = e * 5;
      eo[i] = this.eoc > 0 ? 5 : 0;
      if (this.eoc > 0) this.eoc--;
    }
    // Quantised so a running envelope posts at most one message per block.
    const lv = Math.round(e * 4) / 4;
    if (lv !== this.led) {
      this.led = lv;
      this.port.postMessage({ t: 'led', id: 'env', v: lv });
    }
    return true;
  }
}

registerProcessor('ad', AD);
