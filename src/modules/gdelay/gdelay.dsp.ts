import { Base, ch, clamp, DL, Lcg, TP, type Params } from '../../engine/dsp-prelude';

const VOICES = 6;

/** Grains are captured just behind the write head and replayed pitched, each Hann-windowed
    so overlapping grains crossfade instead of clicking. FEEDBACK routes the wet grain output
    back into the capture buffer, so repeats degrade and re-pitch generation after generation --
    the "feedback delay" the name promises, distinct from GRAIN's straight granular texture. */
class GDelay extends Base {
  buf = new DL(Math.ceil(sampleRate * 1.5));
  rng = new Lcg(20260903);
  age = new Float64Array(VOICES).fill(-1);
  glen = new Float64Array(VOICES);
  grate = new Float64Array(VOICES);
  rr = 0;
  sch = 0;
  next = 1;
  fbOut = 0;

  defaults(): Params {
    return { size: 0.12, dens: 6, pitch: 0, spray: 0.2, fb: 0.3, mix: 0.5 };
  }

  spawn(len: number, rate: number): void {
    let v = this.age.findIndex((a) => a < 0);
    if (v < 0) v = this.rr++ % VOICES;
    this.age[v] = 0;
    this.glen[v] = len;
    this.grate[v] = rate;
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      pcv = ch(I, 1),
      tr = ch(I, 2);
    const out = O[0]?.[0];
    if (!out) return true;
    const { size = 0.12, dens = 6, pitch = 0, spray = 0.2, fb = 0.3, mix = 0.5 } = this.p;
    const len = Math.max(32, Math.round(clamp(size, 0.01, 0.4) * sampleRate));
    let lg = 0;
    for (let i = 0; i < out.length; i++) {
      const x = inp?.[i] ?? 0;
      this.buf.push(clamp(x + fb * this.fbOut, -8, 8));
      let fire = false;
      const g = tr?.[i] ?? 0;
      if (g > 2.5 && lg <= 2.5) fire = true;
      lg = g;
      this.sch += dens / sampleRate;
      if (this.sch >= this.next) {
        this.sch -= this.next;
        this.next = 1 + spray * Math.abs(this.rng.next());
        fire = true;
      }
      if (fire) {
        const semis = clamp(pitch + ((pcv?.[i] ?? 0) / 5) * 24, -24, 24);
        this.spawn(len, Math.pow(2, semis / 12));
      }
      let s = 0;
      for (let v = 0; v < VOICES; v++) {
        const a = this.age[v] ?? -1;
        if (a < 0) continue;
        const gl = this.glen[v] || 1;
        if (a >= gl) {
          this.age[v] = -1;
          continue;
        }
        const win = 0.5 - 0.5 * Math.cos((TP * a) / gl);
        s += this.buf.read(len + a * (1 - (this.grate[v] ?? 1))) * win;
        this.age[v] = a + 1;
      }
      this.fbOut = s;
      out[i] = clamp(x * (1 - mix) + s * mix, -5, 5);
    }
    return true;
  }
}

registerProcessor('gdelay', GDelay);
