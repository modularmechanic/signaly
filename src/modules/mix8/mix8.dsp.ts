import { Base, ch, clamp, flush, type BaseOptions, type Params } from '../../engine/dsp-prelude';
import { biquad, EQ_Q, HI_F, LO_F, MID_F, NB, NCH } from './mix8.eq';

/** Knob prefix → band index in `co`. `mf` is the mid band's frequency, so it re-bakes band 1 too. */
const BAND: Record<string, number> = { lo: 0, mid: 1, mf: 1, hi: 2 };
const EQ_ID = /^(lo|mid|mf|hi)([1-8])$/;

class Mix8 extends Base {
  /** b0,b1,b2,a1,a2 per band per channel — every filter state is allocated here, once. */
  co = new Float64Array(NCH * NB * 5);
  z1 = new Float64Array(NCH * NB);
  z2 = new Float64Array(NCH * NB);
  lv = new Float64Array(NCH);
  pl = new Float64Array(NCH);
  pr = new Float64Array(NCH);
  /** Post-fader send gain per channel, one bus each. */
  s1 = new Float64Array(NCH);
  s2 = new Float64Array(NCH);
  src: (Float32Array | null)[] = Array.from({ length: NCH }, () => null);

  constructor(o?: BaseOptions) {
    super(o);
    for (let c = 0; c < NCH; c++) for (let b = 0; b < NB; b++) this.bake(c, b);
  }

  defaults(): Params {
    const p: Params = { master: 0.8, ret1: 0.8, ret2: 0.8 };
    for (let c = 1; c <= NCH; c++) {
      p[`l${c}`] = 0.75;
      p[`p${c}`] = 0;
      p[`m${c}`] = 0;
      p[`s${c}`] = 0;
      p[`lo${c}`] = 0;
      p[`mid${c}`] = 0;
      p[`mf${c}`] = MID_F;
      p[`hi${c}`] = 0;
      p[`snd1_${c}`] = 0;
      p[`snd2_${c}`] = 0;
    }
    return p;
  }

  bake(c: number, b: number): void {
    const n = c + 1;
    const f = b === 0 ? LO_F : b === 1 ? (this.p[`mf${n}`] ?? MID_F) : HI_F;
    const g = this.p[`${b === 0 ? 'lo' : b === 1 ? 'mid' : 'hi'}${n}`] ?? 0;
    biquad(b, f, g, EQ_Q, sampleRate, this.co, (c * NB + b) * 5);
  }

  /** An EQ knob re-bakes only its own channel's band; every other param is read per block. */
  onParam(id: string): void {
    const m = EQ_ID.exec(id);
    if (!m) return;
    this.bake(Number(m[2]) - 1, BAND[m[1] ?? ''] ?? 1);
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const l = O[4]?.[0];
    const r = O[5]?.[0];
    if (!l || !r) return true;
    const s1l = O[0]?.[0];
    const s1r = O[1]?.[0];
    const s2l = O[2]?.[0];
    const s2r = O[3]?.[0];
    // Aux sends and returns, console style: each channel feeds the send buses post-fader at its
    // own send level, and whatever comes back on a return is ADDED to the main bus at the return
    // level. The dry mix is never replaced — an unpatched return simply adds nothing.
    const r1l = ch(I, NCH);
    const r1r = ch(I, NCH + 1);
    const r2l = ch(I, NCH + 2);
    const r2r = ch(I, NCH + 3);
    const p = this.p;
    const rg1 = clamp(p.ret1 ?? 0, 0, 1);
    const rg2 = clamp(p.ret2 ?? 0, 0, 1);

    // Solo is exclusive: once any channel is soloed, only soloed channels sound.
    let anySolo = false;
    for (let c = 1; c <= NCH; c++) if ((p[`s${c}`] ?? 0) >= 0.5) anySolo = true;
    for (let c = 0; c < NCH; c++) {
      const mute = (p[`m${c + 1}`] ?? 0) >= 0.5;
      const solo = (p[`s${c + 1}`] ?? 0) >= 0.5;
      this.src[c] = mute || (anySolo && !solo) ? null : ch(I, c);
      const g = clamp(p[`l${c + 1}`] ?? 0, 0, 1);
      this.lv[c] = g * g; // square-law taper: the top third of the throw is the useful one
      const a = (clamp(p[`p${c + 1}`] ?? 0, -1, 1) + 1) * (Math.PI / 4);
      this.pl[c] = Math.cos(a);
      this.pr[c] = Math.sin(a);
      this.s1[c] = clamp(p[`snd1_${c + 1}`] ?? 0, 0, 1);
      this.s2[c] = clamp(p[`snd2_${c + 1}`] ?? 0, 0, 1);
    }
    const mg = clamp(p.master ?? 0, 0, 1) ** 2;

    for (let i = 0; i < l.length; i++) {
      let bl = 0;
      let br = 0;
      let a1l = 0;
      let a1r = 0;
      let a2l = 0;
      let a2r = 0;
      for (let c = 0; c < NCH; c++) {
        const s = this.src[c];
        if (!s) continue;
        let y = (s[i] ?? 0) * (this.lv[c] ?? 0);
        for (let b = 0; b < NB; b++) {
          const k = c * NB + b;
          const o = k * 5;
          const x = y;
          y = (this.co[o] ?? 0) * x + (this.z1[k] ?? 0);
          this.z1[k] = flush((this.co[o + 1] ?? 0) * x - (this.co[o + 3] ?? 0) * y + (this.z2[k] ?? 0));
          this.z2[k] = flush((this.co[o + 2] ?? 0) * x - (this.co[o + 4] ?? 0) * y);
        }
        const yl = y * (this.pl[c] ?? 0);
        const yr = y * (this.pr[c] ?? 0);
        bl += yl;
        br += yr;
        const g1 = this.s1[c] ?? 0;
        const g2 = this.s2[c] ?? 0;
        a1l += yl * g1;
        a1r += yr * g1;
        a2l += yl * g2;
        a2r += yr * g2;
      }
      if (s1l) s1l[i] = clamp(flush(a1l), -10, 10);
      if (s1r) s1r[i] = clamp(flush(a1r), -10, 10);
      if (s2l) s2l[i] = clamp(flush(a2l), -10, 10);
      if (s2r) s2r[i] = clamp(flush(a2r), -10, 10);
      bl += (r1l?.[i] ?? 0) * rg1 + (r2l?.[i] ?? 0) * rg2;
      br += (r1r?.[i] ?? 0) * rg1 + (r2r?.[i] ?? 0) * rg2;
      l[i] = clamp(flush(bl * mg), -10, 10);
      r[i] = clamp(flush(br * mg), -10, 10);
    }
    return true;
  }
}
registerProcessor('mix8', Mix8);
