import { Base, ch, clamp, DL, Lcg, TP, type Params } from '../../engine/dsp-prelude';

const VOICES = 8;

// Live capture buffer, Hann-windowed grains scheduled at DENSITY. SPRAY is the only
// source of randomness: at 0 the onsets are a metronome, at 1 a cloud.
class Grain extends Base {
  buf = new DL(sampleRate * 2);
  rng = new Lcg(20260903);
  age = new Float64Array(VOICES).fill(-1);
  glen = new Float64Array(VOICES);
  gd0 = new Float64Array(VOICES);
  grate = new Float64Array(VOICES);
  gpan = new Float64Array(VOICES);
  rr = 0;
  sch = 0;
  next = 1;
  lg = 0;

  defaults(): Params {
    return { size: 0.06, dens: 8, pitch: 0, spray: 0, pos: 0.2, posA: 0, mix: 0.6 };
  }

  spawn(len: number, rate: number, d0: number, spray: number, maxD: number): void {
    let v = this.age.findIndex((a) => a < 0);
    if (v < 0) v = this.rr++ % VOICES;
    this.age[v] = 0;
    this.glen[v] = len;
    this.grate[v] = rate;
    // start far enough back that the grain cannot outrun the write head
    this.gd0[v] = clamp(d0, Math.min(maxD, len * rate), maxD);
    this.gpan[v] = 0.5 + spray * this.rng.next() * 0.5;
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      pcv = ch(I, 1),
      tr = ch(I, 2);
    const l = O[0]?.[0],
      r = O[1]?.[0];
    if (!l || !r) return true;
    const { size = 0.06, dens = 8, pitch = 0, spray = 0, pos = 0.2, mix = 0.6 } = this.p;
    const len = Math.max(16, Math.round(clamp(size, 0.001, 1) * sampleRate));
    const rate = Math.pow(2, clamp(pitch, -24, 24) / 12);
    const maxD = Math.max(len, this.buf.n - 2 * len - 4);
    for (let i = 0; i < l.length; i++) {
      const x = inp?.[i] ?? 0;
      this.buf.push(x);
      let fire = false;
      const g = tr?.[i] ?? 0;
      if (g > 2.5 && this.lg <= 2.5) fire = true;
      this.lg = g;
      this.sch += dens / sampleRate;
      if (this.sch >= this.next) {
        this.sch -= this.next;
        this.next = 1 + spray * Math.abs(this.rng.next()) * 0.9;
        fire = true;
      }
      if (fire) {
        const p = clamp(pos + (pcv?.[i] ?? 0) / 5, 0, 1) + spray * Math.abs(this.rng.next()) * 0.25;
        this.spawn(len, rate, p * maxD, spray, maxD);
      }
      let sl = 0,
        sr = 0;
      for (let v = 0; v < VOICES; v++) {
        const a = this.age[v] ?? -1;
        if (a < 0) continue;
        const gl = this.glen[v] || 1;
        if (a >= gl) {
          this.age[v] = -1;
          continue;
        }
        const win = 0.5 - 0.5 * Math.cos((TP * a) / gl);
        const s = this.buf.read((this.gd0[v] ?? 0) + a * (1 - (this.grate[v] ?? 1))) * win;
        const pan = this.gpan[v] ?? 0.5;
        sl += s * Math.sqrt(1 - pan);
        sr += s * Math.sqrt(pan);
        this.age[v] = a + 1;
      }
      l[i] = clamp(x * (1 - mix) + sl * mix, -5, 5);
      r[i] = clamp(x * (1 - mix) + sr * mix, -5, 5);
    }
    return true;
  }
}

registerProcessor('grain', Grain);
