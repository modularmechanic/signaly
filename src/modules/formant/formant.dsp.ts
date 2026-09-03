import { Base, ch, clamp, type Params } from '../../engine/dsp-prelude';

// A E I O U — three formant centres each, interpolated by the VOWEL knob.
const VOWELS = new Float64Array([
  730, 1090, 2440, 530, 1840, 2480, 390, 1990, 2550, 570, 840, 2410, 440, 1020, 2240,
]);
const GAINS = [1, 0.55, 0.3];

class Formant extends Base {
  // three band-pass sections, two integrator states each
  st = new Float64Array(6);

  defaults(): Params {
    return { vowel: 0, res: 0.85 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      vc = ch(I, 1);
    const out = O[0]?.[0];
    if (!out) return true;
    const { vowel = 0, res = 0.85 } = this.p;
    const k = 2 - 1.9 * clamp(res, 0, 0.99);
    for (let i = 0; i < out.length; i++) {
      const vw = clamp(vowel + ((vc?.[i] ?? 0) / 5) * 2, 0, 4);
      const i0 = Math.min(3, vw | 0),
        fr = vw - i0;
      const x = (inp?.[i] ?? 0) / 5;
      let y = 0;
      for (let f = 0; f < 3; f++) {
        const fc = (VOWELS[i0 * 3 + f] ?? 0) * (1 - fr) + (VOWELS[i0 * 3 + 3 + f] ?? 0) * fr;
        const g = Math.tan((Math.PI * clamp(fc, 60, sampleRate * 0.4)) / sampleRate);
        const a1 = 1 / (1 + g * (g + k));
        const s0 = this.st[f * 2] ?? 0,
          s1 = this.st[f * 2 + 1] ?? 0;
        const hp = (x - (g + k) * s0 - s1) * a1;
        const bp = g * hp + s0;
        const lp = g * bp + s1;
        this.st[f * 2] = g * hp + bp;
        this.st[f * 2 + 1] = g * bp + lp;
        y += bp * (GAINS[f] ?? 0);
      }
      out[i] = clamp(y * 7, -5, 5);
    }
    return true;
  }
}

registerProcessor('formant', Formant);
