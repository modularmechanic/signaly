import { Base, ch, clamp, flush, type BaseOptions, type Params } from '../../engine/dsp-prelude';
import { biquad, EQ_F, EQ_Q, NB, NCH } from './mix8.eq';

const FIELD = ['f', 'g', 'q'];
const sel = (p: Params): number => clamp(Math.round(p.sel ?? 0), 0, NCH - 1);

class Mix8 extends Base {
  /** b0,b1,b2,a1,a2 per band per channel — every filter state is allocated here, once. */
  co = new Float64Array(NCH * NB * 5);
  z1 = new Float64Array(NCH * NB);
  z2 = new Float64Array(NCH * NB);
  /** f,g,q per band per channel: the 8 independent EQs behind the one visible knob set. */
  eq = new Float64Array(NCH * NB * 3);
  lv = new Float64Array(NCH);
  pl = new Float64Array(NCH);
  pr = new Float64Array(NCH);
  src: (Float32Array | null)[] = Array.from({ length: NCH }, () => null);

  constructor(o?: BaseOptions) {
    super(o);
    for (let c = 0; c < NCH; c++) {
      for (let b = 0; b < NB; b++) {
        const i = (c * NB + b) * 3;
        this.eq[i] = this.p[`eq${b + 1}f`] ?? EQ_F[b] ?? 1000;
        this.eq[i + 1] = this.p[`eq${b + 1}g`] ?? 0;
        this.eq[i + 2] = this.p[`eq${b + 1}q`] ?? EQ_Q;
        this.bake(c, b);
      }
    }
  }

  defaults(): Params {
    const p: Params = { master: 0.8, sel: 0 };
    for (let c = 1; c <= NCH; c++) {
      p[`l${c}`] = 0.75;
      p[`p${c}`] = 0;
      p[`m${c}`] = 0;
    }
    for (let b = 1; b <= NB; b++) {
      p[`eq${b}f`] = EQ_F[b - 1] ?? 1000;
      p[`eq${b}g`] = 0;
      p[`eq${b}q`] = EQ_Q;
    }
    return p;
  }

  bake(c: number, b: number): void {
    const i = (c * NB + b) * 3;
    biquad(
      b,
      this.eq[i] ?? 1000,
      this.eq[i + 1] ?? 0,
      this.eq[i + 2] ?? EQ_Q,
      sampleRate,
      this.co,
      (c * NB + b) * 5,
    );
  }

  /** The 12 visible EQ params always address the selected channel; SEL re-seeds them. */
  onParam(id: string, v: number): void {
    if (id === 'sel') return this.dump();
    if (!id.startsWith('eq')) return;
    const b = Number(id[2]) - 1;
    const f = FIELD.indexOf(id[3] ?? '');
    if (!(b >= 0 && b < NB) || f < 0) return;
    const c = sel(this.p);
    this.eq[(c * NB + b) * 3 + f] = v;
    this.bake(c, b);
  }

  dump(): void {
    const c = sel(this.p);
    const v: number[] = [];
    for (let b = 0; b < NB; b++) for (let f = 0; f < 3; f++) v.push(this.eq[(c * NB + b) * 3 + f] ?? 0);
    this.port.postMessage({ t: 'eqdump', ch: c, v });
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const l = O[4]?.[0];
    const r = O[5]?.[0];
    if (!l || !r) return true;
    const s1l = O[0]?.[0];
    const s1r = O[1]?.[0];
    const s2l = O[2]?.[0];
    const s2r = O[3]?.[0];
    // An unpatched worklet input arrives as an empty channel list, so `ch()` is the only
    // cable state the DSP can see: null on both legs of a return means "bypass the insert".
    // A return that IS patched but silent therefore mutes the bus — correct for a real
    // insert, and the send still runs, so nothing is silently lost.
    const r1l = ch(I, NCH);
    const r1r = ch(I, NCH + 1);
    const r2l = ch(I, NCH + 2);
    const r2r = ch(I, NCH + 3);
    const ret1 = r1l !== null || r1r !== null;
    const ret2 = r2l !== null || r2r !== null;
    const p = this.p;

    for (let c = 0; c < NCH; c++) {
      this.src[c] = (p[`m${c + 1}`] ?? 0) >= 0.5 ? null : ch(I, c);
      const g = clamp(p[`l${c + 1}`] ?? 0, 0, 1);
      this.lv[c] = g * g; // square-law taper: the top third of the throw is the useful one
      const a = (clamp(p[`p${c + 1}`] ?? 0, -1, 1) + 1) * (Math.PI / 4);
      this.pl[c] = Math.cos(a);
      this.pr[c] = Math.sin(a);
    }
    const mg = clamp(p.master ?? 0, 0, 1) ** 2;

    for (let i = 0; i < l.length; i++) {
      let bl = 0;
      let br = 0;
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
        bl += y * (this.pl[c] ?? 0);
        br += y * (this.pr[c] ?? 0);
      }
      bl = clamp(flush(bl), -10, 10);
      br = clamp(flush(br), -10, 10);
      if (s1l) s1l[i] = bl;
      if (s1r) s1r[i] = br;
      if (ret1) {
        bl = clamp(flush(r1l?.[i] ?? 0), -10, 10);
        br = clamp(flush(r1r?.[i] ?? 0), -10, 10);
      }
      if (s2l) s2l[i] = bl;
      if (s2r) s2r[i] = br;
      if (ret2) {
        bl = clamp(flush(r2l?.[i] ?? 0), -10, 10);
        br = clamp(flush(r2r?.[i] ?? 0), -10, 10);
      }
      l[i] = clamp(flush(bl * mg), -10, 10);
      r[i] = clamp(flush(br * mg), -10, 10);
    }
    return true;
  }
}
registerProcessor('mix8', Mix8);
