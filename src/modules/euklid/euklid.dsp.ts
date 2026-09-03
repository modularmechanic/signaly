import { Base, ch, clamp, Lcg, type Params } from '../../engine/dsp-prelude';

/** Bresenham Euclidean test: is rotated step `s` of `n` a hit when `f` are filled? */
const onAt = (s: number, n: number, f: number): boolean =>
  f > 0 && Math.floor(((s + 1) * f) / n) - Math.floor((s * f) / n) > 0;

class Euklid extends Base {
  step = -1;
  lc = 0;
  lr = 0;
  rng = new Lcg(918273);
  hit = 0;
  accent = 0;
  sent = -1;
  pat = new Uint8Array(16);

  defaults(): Params {
    return { steps: 16, fill: 5, rot: 0, prob: 1, chaos: 0 };
  }

  rnd(): number {
    return (this.rng.next() + 1) / 2;
  }

  /** Rewrite `pat` for n/f/rot; true when any step changed. */
  repat(n: number, f: number, rot: number): boolean {
    let moved = false;
    for (let k = 0; k < 16; k++) {
      const v = k < n && onAt((k + rot) % n, n, f) ? 1 : 0;
      if (this.pat[k] !== v) {
        this.pat[k] = v;
        moved = true;
      }
    }
    return moved;
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const trig = O[0]?.[0];
    const inv = O[1]?.[0];
    const acc = O[2]?.[0];
    if (!trig || !inv || !acc) return true;
    const clk = ch(I, 0);
    const rst = ch(I, 1);
    const fcv = ch(I, 2);
    const pcv = ch(I, 3);
    const p = this.p;
    for (let i = 0; i < trig.length; i++) {
      const c = clk?.[i] ?? 0;
      const r = rst?.[i] ?? 0;
      if (r > 2.5 && this.lr <= 2.5) this.step = -1;
      this.lr = r;
      if (c > 2.5 && this.lc <= 2.5) {
        const n = clamp(Math.round(p.steps ?? 16), 1, 16);
        const f = clamp(Math.round((p.fill ?? 5) + (fcv?.[i] ?? 0) * 1.6), 0, n);
        const prob = clamp((p.prob ?? 1) + (pcv?.[i] ?? 0) / 5, 0, 1);
        const rot = Math.round(p.rot ?? 0);
        this.step = (this.step + 1) % n;
        const s = (this.step + rot) % n;
        let on = onAt(s, n, f);
        // A group head is a hit whose preceding rotated step is a rest.
        const head = on && !onAt((s + n - 1) % n, n, f);
        const chaos = p.chaos ?? 0;
        if (chaos > 0 && this.rnd() < chaos * 0.4) on = !on;
        if (on && this.rnd() > prob) on = false;
        this.hit = on ? 1 : 0;
        this.accent = on && head ? 1 : 0;
      }
      this.lc = c;
      const high = c > 2.5;
      trig[i] = high && this.hit ? 5 : 0;
      inv[i] = high && !this.hit ? 5 : 0;
      acc[i] = high && this.accent ? 5 : 0;
    }
    // Display posts at block rate, on change only: either the step moved, or FILL /
    // ROTATE redrew the pattern while the clock was stopped.
    const dn = clamp(Math.round(p.steps ?? 16), 1, 16);
    const df = clamp(Math.round((p.fill ?? 5) + (fcv?.[trig.length - 1] ?? 0) * 1.6), 0, dn);
    if (this.repat(dn, df, Math.round(p.rot ?? 0)) || this.step !== this.sent) {
      this.sent = this.step;
      this.port.postMessage({ t: 'step', i: this.step, n: dn, hit: this.hit, pattern: this.pat });
    }
    return true;
  }
}

registerProcessor('euklid', Euklid);
