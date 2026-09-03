import { Base, ch, clamp, flush, lpCoeff, type Params } from '../../engine/dsp-prelude';

/** TAPE: narrower bandwidth, warmer. CONSOLE: harder knee, wider bandwidth, brighter. */
const MODE = [
  { gain: 1.0, hf: 3000 }, // TAPE
  { gain: 1.6, hf: 17000 }, // CONSOLE
] as const;

/** Gentle programme saturation: a soft asymmetric knee (DRIVE, BIAS), a single-knob tilt EQ
    around 1 kHz (TILT), and a mode-fixed bandwidth ceiling standing in for tape head loss
    versus a console op-amp's wider reach. */
class Saturate extends Base {
  tiltLp = 0;
  tiltA = lpCoeff(1000);
  hfLp = 0;

  defaults(): Params {
    return { drive: 1, bias: 0, tilt: 0, level: 0.8, mode: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      dcv = ch(I, 1);
    const out = O[0]?.[0];
    if (!out) return true;
    const p = this.p;
    const mode = MODE[clamp(Math.round(p.mode ?? 0), 0, 1)] ?? MODE[0];
    const bias = clamp(p.bias ?? 0, -1, 1);
    const tiltAmt = clamp(p.tilt ?? 0, -1, 1) * 0.7;
    const level = clamp(p.level ?? 0.8, 0, 1.4);
    const hfA = lpCoeff(mode.hf);
    for (let i = 0; i < out.length; i++) {
      const drv = clamp((p.drive ?? 1) * Math.pow(2, (dcv?.[i] ?? 0) / 5), 0.15, 10);
      const x = (inp?.[i] ?? 0) / 5;
      const u = x * drv * mode.gain;
      const y = Math.tanh(u + bias * 0.25 * u * u);
      this.tiltLp = flush(this.tiltLp + (y - this.tiltLp) * this.tiltA);
      const hp = y - this.tiltLp;
      const tilted = this.tiltLp * (1 - tiltAmt) + hp * (1 + tiltAmt);
      this.hfLp = flush(this.hfLp + (tilted - this.hfLp) * hfA);
      out[i] = clamp(this.hfLp * 5 * level, -5, 5);
    }
    return true;
  }
}
registerProcessor('saturate', Saturate);
