import { Base, ch, clamp, DL, type Params } from '../../engine/dsp-prelude';

const SHIFT_RANGE = 24; // matches the SHIFT knobs' +/-24 semitone span
const CV_VOLTS = 5;

/** Two independently-shifted voices read off one delay line, each as a pair of taps a
    half-window apart, constant-power crossfaded so neither tap's wrap ever clicks. */
class Pitch extends Base {
  buf = new DL(Math.ceil(sampleRate * 0.25));
  phA = 0;
  phB = 0.5; // staggered from voice A so the two voices' own seams don't line up
  lastVoice1 = 0;

  defaults(): Params {
    return { shift1: 0, shift2: 7, scvA: 0, window: 60, fb: 0, mix: 0.5 };
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
      scv = ch(I, 1);
    const out = O[0]?.[0];
    if (!out) return true;
    const p = this.p;
    const w = clamp(((p.window ?? 60) / 1000) * sampleRate, 64, this.buf.n - 4);
    const fb = clamp(p.fb ?? 0, -0.9, 0.9);
    const mix = clamp(p.mix ?? 0.5, 0, 1);
    const semis2 = clamp(p.shift2 ?? 7, -SHIFT_RANGE, SHIFT_RANGE);
    const dB = (Math.pow(2, semis2 / 12) - 1) / w;
    for (let i = 0; i < out.length; i++) {
      const x = inp?.[i] ?? 0;
      const semis1 = clamp(
        (p.shift1 ?? 0) + ((scv?.[i] ?? 0) / CV_VOLTS) * SHIFT_RANGE,
        -SHIFT_RANGE,
        SHIFT_RANGE,
      );
      const dA = (Math.pow(2, semis1 / 12) - 1) / w;
      this.phA += dA;
      this.phA -= Math.floor(this.phA);
      this.phB += dB;
      this.phB -= Math.floor(this.phB);
      const v1 = this.tap(this.phA, w);
      const v2 = this.tap(this.phB, w);
      this.buf.push(clamp(x + fb * this.lastVoice1, -8, 8));
      this.lastVoice1 = v1;
      const wet = (v1 + v2) * 0.5;
      out[i] = clamp(x * (1 - mix) + wet * mix, -5, 5);
    }
    return true;
  }
}

registerProcessor('pitch', Pitch);
