import { Base, ch, clamp, Lcg, TP, type InMsg, type Params } from '../../engine/dsp-prelude';

const VOICES = 8;
/** One full sweep of the loaded sample every this many seconds while not frozen. */
const SCAN_SECONDS = 8;

function readLinear(buf: Float32Array, pos: number): number {
  const n = buf.length;
  const p = pos < 0 ? 0 : pos > n - 1 ? n - 1 : pos;
  const i0 = Math.floor(p);
  const frac = p - i0;
  const s0 = buf[i0] ?? 0;
  const s1 = buf[i0 + 1] ?? s0;
  return s0 + (s1 - s0) * frac;
}

/** Granular synthesis over a loaded, static sample — the GRAIN module's voice engine, but
    reading a fixed buffer by absolute position instead of a live capture ring. An internal
    scan head sweeps the buffer while not FROZEN; POSITION (+ its CV) offsets each new grain
    from wherever the head currently sits. Stereo out, no dry signal — CLOUD has no live input. */
class Cloud extends Base {
  buf: Float32Array | null = null;
  head = 0;
  rng = new Lcg(20260903);
  age = new Float64Array(VOICES).fill(-1);
  glen = new Float64Array(VOICES);
  gpos = new Float64Array(VOICES);
  gpan = new Float64Array(VOICES);
  rr = 0;
  sch = 0;
  next = 1;
  lg = 0;

  defaults(): Params {
    return { size: 0.06, dens: 8, pitch: 0, spray: 0, pos: 0.2, posA: 0, freeze: 0 };
  }

  override msg(m: InMsg): void {
    const v = m.v as unknown;
    if (m.t === 'sample' && v instanceof Float32Array) this.buf = v;
  }

  spawn(len: number, center: number, spray: number, max: number): void {
    let v = this.age.findIndex((a) => a < 0);
    if (v < 0) v = this.rr++ % VOICES;
    this.age[v] = 0;
    this.glen[v] = len;
    this.gpos[v] = clamp(center + spray * this.rng.next() * max * 0.25, 0, max);
    this.gpan[v] = 0.5 + spray * this.rng.next() * 0.5;
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const pcv = ch(I, 0);
    const tr = ch(I, 1);
    const l = O[0]?.[0];
    const r = O[1]?.[0];
    if (!l || !r) return true;
    const buf = this.buf;
    const p = this.p;
    const { size = 0.06, dens = 8, pitch = 0, spray = 0, pos = 0.2 } = p;
    const freeze = (p.freeze ?? 0) >= 0.5;
    const len = Math.max(16, Math.round(clamp(size, 0.001, 1) * sampleRate));
    const rate = Math.pow(2, clamp(pitch, -24, 24) / 12);
    const blen = buf?.length ?? 0;
    const max = Math.max(0, blen - len - 1);
    const scanStep = blen > 0 ? 1 / (SCAN_SECONDS * sampleRate) : 0;
    for (let i = 0; i < l.length; i++) {
      if (!freeze) {
        this.head += scanStep;
        if (this.head >= 1) this.head -= 1;
      }
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
      if (fire && buf && max > 0) {
        let eff = this.head + pos + (pcv?.[i] ?? 0) / 5;
        eff -= Math.floor(eff);
        this.spawn(len, eff * max, spray, max);
      }
      let sl = 0;
      let sr = 0;
      for (let v = 0; v < VOICES; v++) {
        const a = this.age[v] ?? -1;
        if (a < 0) continue;
        const gl = this.glen[v] || 1;
        if (a >= gl) {
          this.age[v] = -1;
          continue;
        }
        const win = 0.5 - 0.5 * Math.cos((TP * a) / gl);
        const s = buf ? readLinear(buf, (this.gpos[v] ?? 0) + a * rate) * win : 0;
        const pan = this.gpan[v] ?? 0.5;
        sl += s * Math.sqrt(1 - pan);
        sr += s * Math.sqrt(pan);
        this.age[v] = a + 1;
      }
      l[i] = clamp(sl * 5, -5, 5);
      r[i] = clamp(sr * 5, -5, 5);
    }
    return true;
  }
}

registerProcessor('cloud', Cloud);
