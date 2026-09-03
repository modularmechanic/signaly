import { Base, ch, clamp, flush, onePoleCoeff, type Params } from '../../engine/dsp-prelude';

/** Germanium: softer knee, fewer harmonics. Silicon: harder knee, brighter and more
    harmonically dense — the two-transistor character the MODE switch selects. */
const MODE = [
  { gain: 2.6, hard: 0.3 }, // GERMANIUM
  { gain: 4.4, hard: 0.75 }, // SILICON
] as const;

class Fuzz extends Base {
  env = 0;
  envA = onePoleCoeff(6);
  gate = 0;
  gateA = onePoleCoeff(4);
  starveEnv = 0;
  starveA = onePoleCoeff(15);

  defaults(): Params {
    return { fuzz: 4, gate: 0, starve: 0, level: 0.8, mode: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      fcv = ch(I, 1);
    const out = O[0]?.[0];
    if (!out) return true;
    const p = this.p;
    const mode = MODE[clamp(Math.round(p.mode ?? 0), 0, 1)] ?? MODE[0];
    const gateThresh = clamp(p.gate ?? 0, 0, 1);
    const starve = clamp(p.starve ?? 0, 0, 1);
    const level = clamp(p.level ?? 0.8, 0, 1.4);
    for (let i = 0; i < out.length; i++) {
      const fuzzAmt = clamp((p.fuzz ?? 4) * Math.pow(2, (fcv?.[i] ?? 0) / 5), 0.3, 20);
      const x = (inp?.[i] ?? 0) / 5;
      this.env = flush(this.env + (Math.abs(x) - this.env) * this.envA);
      this.starveEnv = flush(this.starveEnv + (Math.abs(x) - this.starveEnv) * this.starveA);
      const g = (mode.gain * fuzzAmt) / (1 + this.starveEnv * starve * 5);
      const u = x * g;
      const y = Math.tanh(u) * (1 - mode.hard) + clamp(u, -1, 1) * mode.hard;
      const gateTarget = this.env > gateThresh ? 1 : 0;
      this.gate = flush(this.gate + (gateTarget - this.gate) * this.gateA);
      out[i] = clamp(y * 5 * level * this.gate, -5, 5);
    }
    return true;
  }
}
registerProcessor('fuzz', Fuzz);
