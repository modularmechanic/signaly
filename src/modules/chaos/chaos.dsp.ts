import { Base, ch, clamp, type Params } from '../../engine/dsp-prelude';

const SIGMA = 10;
const BETA = 8 / 3;
/** Attractor time units per second at RATE 1 Hz. */
const TIMESCALE = 10;
/** Forward Euler stays well behaved on the Lorenz system below this step. */
const MAX_DT = 0.01;

// Deterministic but never repeating: nearby states pull apart exponentially,
// which is what separates this from a sample-and-hold noise source.
class Chaos extends Base {
  x = 0.1;
  y = 0;
  z = 20;
  lx = 0.5;
  ly = 0.5;
  lz = 0.5;
  acc = 0;

  defaults(): Params {
    return { rate: 2, strange: 0.25, level: 0.8, mode: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const rcv = ch(I, 0);
    const xo = O[0]?.[0],
      yo = O[1]?.[0],
      zo = O[2]?.[0];
    if (!xo || !yo || !zo) return true;
    const { rate = 2, strange = 0.25, level = 0.8, mode = 0 } = this.p;
    const rho = 24 + strange * 16;
    const lr = 3.5 + strange * 0.4999;
    const amp = 5 * clamp(level, 0, 1);
    for (let i = 0; i < xo.length; i++) {
      const r = clamp(rate * Math.pow(2, rcv?.[i] ?? 0), 0.001, 60);
      if (mode < 0.5) {
        const dt = Math.min(MAX_DT, (r * TIMESCALE) / sampleRate);
        const dx = SIGMA * (this.y - this.x);
        const dy = this.x * (rho - this.z) - this.y;
        const dz = this.x * this.y - BETA * this.z;
        this.x = clamp(this.x + dx * dt, -120, 120);
        this.y = clamp(this.y + dy * dt, -160, 160);
        this.z = clamp(this.z + dz * dt, -10, 200);
        xo[i] = clamp(this.x / 20, -1, 1) * amp;
        yo[i] = clamp(this.y / 26, -1, 1) * amp;
        zo[i] = clamp((this.z - 25) / 25, -1, 1) * amp;
      } else {
        this.acc += r / sampleRate;
        if (this.acc >= 1) {
          this.acc -= 1;
          this.lz = this.ly;
          this.ly = this.lx;
          this.lx = clamp(lr * this.lx * (1 - this.lx), 0, 1);
        }
        xo[i] = (this.lx * 2 - 1) * amp;
        yo[i] = (this.ly * 2 - 1) * amp;
        zo[i] = (this.lz * 2 - 1) * amp;
      }
    }
    return true;
  }
}

registerProcessor('chaos', Chaos);
