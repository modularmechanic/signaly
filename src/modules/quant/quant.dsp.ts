import { Base, ch, clamp, onePoleCoeff, type Params } from '../../engine/dsp-prelude';

const CHROMATIC = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

/** Semitone degrees per scale; index matches the SCALE switch options. */
const SCALES: readonly (readonly number[])[] = [
  CHROMATIC,
  [0, 2, 4, 5, 7, 9, 11],
  [0, 2, 3, 5, 7, 8, 10],
  [0, 2, 3, 5, 7, 9, 10],
  [0, 2, 4, 7, 9],
  [0, 2, 4, 6, 8, 10],
];

/** Nearest degree of `sc` to `semi`, in absolute semitones (octave wrap included). */
function snap(semi: number, sc: readonly number[]): number {
  const oct = Math.floor(semi / 12);
  const rel = semi - oct * 12;
  let best = sc[0] ?? 0;
  let near = Math.abs(best - rel);
  for (const d of sc) {
    const dd = Math.abs(d - rel);
    if (dd < near) {
      near = dd;
      best = d;
    }
  }
  const up = 12 + (sc[0] ?? 0);
  if (Math.abs(up - rel) < near) best = up;
  return oct * 12 + best;
}

// Glide runs BEFORE the quantiser, so OUT is never between two degrees: a quantiser
// that slewed its output would spend the whole slew emitting notes outside the scale.
class Quant extends Base {
  glided = 0;
  held = 0;
  primed = false;
  lastTrig = 0;
  lastNote = NaN;
  pulse = 0;

  defaults(): Params {
    return { root: 0, transpose: 0, glide: 0.02, scale: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const out = O[0]?.[0];
    const change = O[1]?.[0];
    if (!out || !change) return true;
    const inp = ch(I, 0);
    const trig = ch(I, 1);
    const p = this.p;
    const sc = SCALES[clamp(Math.round(p.scale ?? 0), 0, SCALES.length - 1)] ?? CHROMATIC;
    const root = clamp(Math.round(p.root ?? 0), 0, 11);
    const transpose = Math.round(clamp(p.transpose ?? 0, -24, 24));
    const a = onePoleCoeff(clamp(p.glide ?? 0.02, 0.001, 1) * 1000);
    const pulseLen = Math.max(1, (sampleRate * 0.002) | 0);
    for (let i = 0; i < out.length; i++) {
      const x = inp?.[i] ?? 0;
      // Unpatched TRIG tracks continuously; patched TRIG holds until the next rising edge.
      if (trig) {
        const g = trig[i] ?? 0;
        if (g > 2.5 && this.lastTrig <= 2.5) {
          this.held = x;
          this.primed = true;
        }
        this.lastTrig = g;
      } else {
        this.held = x;
        this.primed = true;
      }
      this.glided += ((this.primed ? this.held : 0) - this.glided) * a;
      const note = snap(this.glided * 12 - root, sc) + root + transpose;
      if (note !== this.lastNote) {
        if (!Number.isNaN(this.lastNote)) this.pulse = pulseLen;
        this.lastNote = note;
      }
      out[i] = clamp(note / 12, -5, 5);
      change[i] = this.pulse > 0 ? 5 : 0;
      if (this.pulse > 0) this.pulse--;
    }
    return true;
  }
}

registerProcessor('quant', Quant);
