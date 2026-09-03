import { Base, ch, clamp, DL, OnePole, lpCoeff, type Params } from '../../engine/dsp-prelude';

const SHIFT_SEMIS = 12; // fixed octave-up: the "shimmer" character, not a knob

/** A feedback loop where every regeneration is pitch-shifted up an octave. The shift reuses
    PITCH's own two-tap constant-power overlap-add (see pitch.dsp.ts) so the read wraps click
    free, and a one-pole low-pass damps the loop before it re-enters the buffer, so the wash
    rolls off into the top end instead of building toward a harsh ceiling. */
class Shimmer extends Base {
  buf = new DL(Math.ceil(sampleRate * 0.25));
  ph = 0;
  damp = new OnePole(0, 0);

  defaults(): Params {
    return { fb: 0.55, window: 0.08, damp: 5000, mix: 0.35 };
  }

  /** Two reads a half-window apart, constant-power blended: click-free wrap. */
  tap(ph: number, w: number): number {
    const ph2 = ph < 0.5 ? ph + 0.5 : ph - 0.5;
    const s1 = this.buf.read(w * (1 - ph));
    const s2 = this.buf.read(w * (1 - ph2));
    const eA = Math.sin(Math.PI * ph) ** 2;
    return s1 * eA + s2 * (1 - eA);
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      fcv = ch(I, 1);
    const L = O[0]?.[0],
      R = O[1]?.[0];
    if (!L || !R) return true;
    const p = this.p;
    const w = clamp((p.window ?? 0.08) * sampleRate, 64, this.buf.n - 4);
    const mix = clamp(p.mix ?? 0.35, 0, 1);
    this.damp.a = lpCoeff(clamp(p.damp ?? 5000, 300, 18000));
    const d = (Math.pow(2, SHIFT_SEMIS / 12) - 1) / w;
    for (let i = 0; i < L.length; i++) {
      const x = inp?.[i] ?? 0;
      const fb = clamp((p.fb ?? 0.55) + (fcv?.[i] ?? 0) / 5, 0, 0.97);
      const wetL = this.tap(this.ph, w);
      const wetR = this.tap((this.ph + 0.37) % 1, w);
      const damped = this.damp.process(wetL);
      this.buf.push(clamp(x + fb * damped, -8, 8));
      this.ph += d;
      this.ph -= Math.floor(this.ph);
      L[i] = clamp(x * (1 - mix) + damped * mix, -5, 5);
      R[i] = clamp(x * (1 - mix) + wetR * mix, -5, 5);
    }
    return true;
  }
}

registerProcessor('shimmer', Shimmer);
