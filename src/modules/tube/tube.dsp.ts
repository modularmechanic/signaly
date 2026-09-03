import { Base, ch, clamp, flush, lpCoeff, type Params } from '../../engine/dsp-prelude';

/** Fixed per-type character, indexed by the TYPE switch: overall gain, baseline
    even-harmonic asymmetry, and how hard the supply sags under level.
    12AX7 hot and asymmetric; 12AU7 low-gain and clean; 6L6/EL34 power-tube style
    with more even harmonics and sag; KT88 cleanest, with the most headroom. */
const TYPES = [
  { gain: 1.8, asym: 0.4, sag: 0.15 }, // 12AX7
  { gain: 0.6, asym: 0.08, sag: 0.05 }, // 12AU7
  { gain: 1.1, asym: 0.22, sag: 0.35 }, // 6L6
  { gain: 1.25, asym: 0.3, sag: 0.5 }, // EL34
  { gain: 0.45, asym: 0.03, sag: 0.02 }, // KT88
] as const;

class Tube extends Base {
  env = 0;
  envA = lpCoeff(8);
  lp = 0;

  defaults(): Params {
    return { drive: 3, bias: 0, sag: 0.3, tone: 6000, level: 0.8, type: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      dcv = ch(I, 1);
    const out = O[0]?.[0];
    if (!out) return true;
    const p = this.p;
    const idx = clamp(Math.round(p.type ?? 0), 0, TYPES.length - 1);
    const t = TYPES[idx] ?? TYPES[0];
    const tc = lpCoeff(clamp(p.tone ?? 6000, 150, 18000));
    const sagAmt = clamp(p.sag ?? 0.3, 0, 1) * t.sag;
    const asym = t.asym + clamp(p.bias ?? 0, -1, 1) * 0.3;
    const level = clamp(p.level ?? 0.8, 0, 1.4);
    for (let i = 0; i < out.length; i++) {
      const drive = clamp((p.drive ?? 3) * Math.pow(2, (dcv?.[i] ?? 0) / 5), 0.2, 20);
      const x = (inp?.[i] ?? 0) / 5;
      this.env = flush(this.env + (Math.abs(x) - this.env) * this.envA);
      const g = (t.gain * drive) / (1 + this.env * sagAmt * 4);
      const u = x * g;
      const y = Math.tanh(u + asym * u * u);
      this.lp = flush(this.lp + (y - this.lp) * tc);
      out[i] = clamp(this.lp * 5 * level, -5, 5);
    }
    return true;
  }
}
registerProcessor('tube', Tube);
