// HOUSE-RULE EXCEPTION: this file is over 200 lines on purpose — four reverb
// topologies share one front-end and one state block; splitting them would add
// indirection without removing a single line of DSP.
//
// REVERB — multi-algorithm stereo reverb. ALGORITHM picks a different TOPOLOGY,
// not a preset of one network:
//   0 HALL      -> Feedback Delay Network (4-line Householder), medium/lush
//   1 PLATE     -> Dattorro figure-8 plate tank (dense, metallic)
//   2 ROOM      -> Schroeder/Freeverb (parallel damped combs + series allpass)
//   3 CATHEDRAL -> FDN, long delays + deeper mod, huge tail
// Shared front-end: predelay + input HPF/LPF. The common knobs map onto
// whichever network is active.
import {
  Base,
  ch,
  clamp,
  flush,
  onePoleCoeff,
  DL,
  OnePole,
  lpCoeff,
  TP,
  type BaseOptions,
  type Params,
} from '../../engine/dsp-prelude';

const SZ_TAU_MS = 34.7118;
const SZ_TAU_LONG_MS = 41.6562;

interface AP {
  d: DL;
  n: number;
  g: number;
}

type Quad<T> = [T, T, T, T];

class Reverb extends Base {
  s = 1;
  sr44 = 1;
  // shared front-end
  pre: DL;
  lpIn = 0;
  hpIn = 0;
  ph = 0;
  sz = new OnePole(SZ_TAU_MS, 1);
  szCoefShort = onePoleCoeff(SZ_TAU_MS);
  szCoefLong = onePoleCoeff(SZ_TAU_LONG_MS);

  // --- PLATE: Dattorro tank ---
  ap: Quad<AP>;
  t1ap: AP;
  t1d1: DL;
  t1n1: number;
  t1ap2: AP;
  t1d2: DL;
  t1n2: number;
  t2ap: AP;
  t2d1: DL;
  t2n1: number;
  t2ap2: AP;
  t2d2: DL;
  t2n2: number;
  lp1 = 0;
  lp2 = 0;
  hp1 = 0;
  hp2 = 0;

  // --- HALL / CATHEDRAL: FDN (4 lines) ---
  fdn: Quad<DL>;
  fdnLen: Quad<number> = [2999, 3343, 3767, 4127]; // base sample lengths @ ref rate
  fdnLp: Quad<number> = [0, 0, 0, 0];

  // --- ROOM: Schroeder (4 combs + 2 allpass, mono core + stereo decorrelation) ---
  comb: Quad<DL>;
  combLen: Quad<number> = [1557, 1617, 1491, 1422];
  combLp: Quad<number> = [0, 0, 0, 0];
  sap: [AP, AP];
  decorr: DL;

  defaults(): Params {
    return {
      pre: 0.02,
      decay: 0.8,
      size: 1,
      diff: 0.7,
      inhp: 20,
      inlp: 14000,
      damp: 7000,
      lowd: 40,
      mrate: 0.6,
      mdep: 0.4,
      mix: 0.35,
      algo: 0,
    };
  }

  constructor(o?: BaseOptions) {
    super(o);
    const s = sampleRate / 29761;
    this.s = s;
    this.sr44 = sampleRate / 44100;
    const mk = (n: number): DL => new DL(Math.ceil(n * s * 5.7) + 16);
    this.pre = new DL(Math.ceil(sampleRate * 0.3));

    // Dattorro (PLATE)
    this.ap = [142, 107, 379, 277].map((n) => ({ d: mk(n), n: n * s, g: 0.75 })) as Quad<AP>;
    this.t1ap = { d: mk(672), n: 672 * s, g: 0.7 };
    this.t1d1 = mk(4453);
    this.t1n1 = 4453 * s;
    this.t1ap2 = { d: mk(1800), n: 1800 * s, g: 0.5 };
    this.t1d2 = mk(3720);
    this.t1n2 = 3720 * s;
    this.t2ap = { d: mk(908), n: 908 * s, g: 0.7 };
    this.t2d1 = mk(4217);
    this.t2n1 = 4217 * s;
    this.t2ap2 = { d: mk(2656), n: 2656 * s, g: 0.5 };
    this.t2d2 = mk(3163);
    this.t2n2 = 3163 * s;

    // FDN (HALL / CATHEDRAL) — mutually-prime base lengths, sized for the largest tuning
    this.fdn = this.fdnLen.map((n) => new DL(Math.ceil(n * s * 6) + 32)) as Quad<DL>;

    // Schroeder (ROOM) — Freeverb comb/allpass lengths @44.1k
    this.comb = this.combLen.map((n) => new DL(Math.ceil(n * this.sr44 * 1.6) + 16)) as Quad<DL>;
    this.sap = [225, 556].map((n) => ({
      d: new DL(Math.ceil(n * this.sr44) + 8),
      n: n * this.sr44,
      g: 0.5,
    })) as [AP, AP];
    this.decorr = new DL(Math.ceil(0.013 * sampleRate) + 8);
  }

  private apRun(ap: AP, x: number, off: number, S: number): number {
    const d = ap.d.read(ap.n * S + off);
    const y = -ap.g * x + d;
    ap.d.push(x + ap.g * y);
    return y;
  }

  /** One damped Freeverb comb; returns its pre-damp read so the sum stays bright. */
  private combRun(k: 0 | 1 | 2 | 3, x: number, lenScale: number, dampC: number, fb: number): number {
    const line = this.comb[k];
    const y = line.read(this.combLen[k] * this.sr44 * lenScale);
    this.combLp[k] = flush(this.combLp[k] + (y - this.combLp[k]) * dampC);
    line.push(x + this.combLp[k] * fb);
    return y;
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const iL = ch(I, 0),
      iR = ch(I, 1);
    const szCV = ch(I, 2),
      dcCV = ch(I, 3),
      mxCV = ch(I, 4);
    const L = O[0]?.[0],
      R = O[1]?.[0];
    if (!L || !R) return true;
    const p = this.p,
      s = this.s;
    const algo = clamp((p.algo ?? 0) | 0, 0, 3);
    const kSize = p.size ?? 1,
      kDecay = p.decay ?? 0.8,
      kMix = p.mix ?? 0.35,
      kDiff = p.diff ?? 0.7,
      kMrate = p.mrate ?? 0.6,
      kMdep = p.mdep ?? 0.4;

    // shared per-block coeffs
    const ilpC = lpCoeff(clamp(p.inlp ?? 14000, 200, 18000));
    const ihpC = lpCoeff(clamp(p.inhp ?? 20, 10, 2000));
    const dampC = lpCoeff(clamp(p.damp ?? 7000, 200, 18000));
    const lowC = lpCoeff(clamp(p.lowd ?? 40, 10, 2000));
    const preS = clamp(p.pre ?? 0.02, 0, 0.29) * sampleRate;

    for (let i = 0; i < L.length; i++) {
      const dl = iL?.[i] ?? 0,
        dr = iR?.[i] ?? 0;
      const mix = clamp(kMix + (mxCV?.[i] ?? 0) / 5, 0, 1);
      const szT = clamp(kSize + (szCV?.[i] ?? 0) * 0.2, 0.3, 2.5);
      const decK = clamp(kDecay + (dcCV?.[i] ?? 0) * 0.08, 0.1, 0.999);

      // predelay + input HPF/LPF (shared front-end)
      this.pre.push((dl + dr) * 0.5);
      let x = this.pre.read(preS);
      this.lpIn = flush(this.lpIn + (x - this.lpIn) * ilpC);
      this.hpIn = flush(this.hpIn + (this.lpIn - this.hpIn) * ihpC);
      x = this.lpIn - this.hpIn;

      let yl: number, yr: number;

      if (algo === 1) {
        // ---------- PLATE: Dattorro figure-8 tank ----------
        this.sz.a = this.szCoefShort;
        const S = this.sz.process(szT * 0.85);
        const dec = clamp(decK, 0, 0.9994);
        const df = clamp(kDiff * 1.25, 0.1, 0.92);
        this.ap[0].g = this.ap[1].g = clamp((0.75 * df) / 0.7, 0.1, 0.8);
        this.ap[2].g = this.ap[3].g = clamp((0.625 * df) / 0.7, 0.1, 0.72);
        this.t1ap.g = this.t2ap.g = clamp((0.7 * df) / 0.7, 0.1, 0.78);
        this.ph += kMrate / sampleRate;
        if (this.ph > 1) this.ph -= 1;
        const m1 = Math.sin(TP * this.ph) * 14 * s * kMdep;
        const m2 = Math.sin(TP * (this.ph + 0.33)) * 14 * s * kMdep;
        for (const a of this.ap) x = this.apRun(a, x, 0, S);
        let a = x + this.t2d2.read(this.t2n2 * S) * dec;
        a = this.apRun(this.t1ap, a, m1, S);
        this.t1d1.push(a);
        let b1 = this.t1d1.read(this.t1n1 * S);
        this.lp1 = flush(this.lp1 + (b1 - this.lp1) * dampC);
        this.hp1 = flush(this.hp1 + (this.lp1 - this.hp1) * lowC);
        b1 = clamp((this.lp1 - this.hp1) * dec, -8, 8);
        b1 = this.apRun(this.t1ap2, b1, 0, S);
        this.t1d2.push(b1);
        let c = x + this.t1d2.read(this.t1n2 * S) * dec;
        c = this.apRun(this.t2ap, c, m2, S);
        this.t2d1.push(c);
        let b2 = this.t2d1.read(this.t2n1 * S);
        this.lp2 = flush(this.lp2 + (b2 - this.lp2) * dampC);
        this.hp2 = flush(this.hp2 + (this.lp2 - this.hp2) * lowC);
        b2 = clamp((this.lp2 - this.hp2) * dec, -8, 8);
        b2 = this.apRun(this.t2ap2, b2, 0, S);
        this.t2d2.push(b2);
        yl =
          0.55 *
          (this.t2d1.read(266 * s * S) + this.t2d1.read(2974 * s * S) - this.t2ap2.d.read(1913 * s * S));
        yr =
          0.55 *
          (this.t1d1.read(353 * s * S) + this.t1d1.read(3627 * s * S) - this.t1ap2.d.read(1228 * s * S));
      } else if (algo === 2) {
        // ---------- ROOM: Schroeder / Freeverb ----------
        this.sz.a = this.szCoefShort;
        const lenScale = 0.7 + 0.3 * clamp(this.sz.process(szT), 0.3, 2.5); // size nudges room dimensions
        const fb = clamp(0.7 + decK * 0.28, 0.7, 0.985); // comb feedback from decay
        let cs =
          (this.combRun(0, x, lenScale, dampC, fb) +
            this.combRun(1, x, lenScale, dampC, fb) +
            this.combRun(2, x, lenScale, dampC, fb) +
            this.combRun(3, x, lenScale, dampC, fb)) *
          0.25;
        const df = clamp(0.4 + kDiff * 0.35, 0.3, 0.78);
        this.sap[0].g = this.sap[1].g = df;
        cs = this.apRun(this.sap[0], cs, 0, 1);
        cs = this.apRun(this.sap[1], cs, 0, 1);
        this.decorr.push(cs);
        yl = cs;
        yr = this.decorr.read(0.011 * sampleRate); // short decorrelation for stereo width
      } else {
        // ---------- HALL (0) / CATHEDRAL (3): Feedback Delay Network ----------
        const large = algo === 3;
        this.sz.a = this.szCoefLong;
        const S = this.sz.process((large ? 1.9 : 1.0) * szT);
        const g = clamp(large ? 0.5 + decK * 0.497 : 0.4 + decK * 0.585, 0.2, 0.9985); // feedback gain
        this.ph += (kMrate * (large ? 0.6 : 1)) / sampleRate;
        if (this.ph > 1) this.ph -= 1;
        const md = (large ? 22 : 12) * s * kMdep;
        const lp = this.fdnLp;
        const d0 =
          lp[0] + (this.fdn[0].read(this.fdnLen[0] * s * S + Math.sin(TP * this.ph) * md) - lp[0]) * dampC;
        const d1 =
          lp[1] +
          (this.fdn[1].read(this.fdnLen[1] * s * S + Math.sin(TP * (this.ph + 0.25)) * md) - lp[1]) * dampC;
        const d2 = lp[2] + (this.fdn[2].read(this.fdnLen[2] * s * S) - lp[2]) * dampC;
        const d3 = lp[3] + (this.fdn[3].read(this.fdnLen[3] * s * S) - lp[3]) * dampC;
        // Damping states sit inside a loop with feedback up to 0.9985 — the
        // longest-dwelling denormal source in the rack. The lines themselves
        // flush inside DL.push.
        lp[0] = flush(d0);
        lp[1] = flush(d1);
        lp[2] = flush(d2);
        lp[3] = flush(d3);
        // Householder 4x4 feedback matrix (orthogonal → lossless before g)
        const su = (d0 + d1 + d2 + d3) * 0.5;
        this.fdn[0].push(x + (d0 - su) * g);
        this.fdn[1].push(x + (d1 - su) * g);
        this.fdn[2].push(x + (d2 - su) * g);
        this.fdn[3].push(x + (d3 - su) * g);
        yl = (d0 - d2) * 0.6;
        yr = (d1 - d3) * 0.6;
      }

      L[i] = dl * (1 - mix) + clamp(yl, -8, 8) * mix;
      R[i] = dr * (1 - mix) + clamp(yr, -8, 8) * mix;
    }
    return true;
  }
}
registerProcessor('reverb', Reverb);
