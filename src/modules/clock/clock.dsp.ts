import { Base, ch, type Params } from '../../engine/dsp-prelude';

/** index -> beat multiplier; mirrors the fRate labels ÷8 ÷4 ÷2 ×1 ×2 ×4 ×8. */
const RATE_MULT = [0.125, 0.25, 0.5, 1, 2, 4, 8];

class Clock extends Base {
  b = 0;
  running = false;
  initd = false;
  prevRunSw = 0;
  prst = 0;
  pss = 0;
  recHold = 0;
  dirty = true;

  defaults(): Params {
    return { bpm: 120, run: 0, r1: 3, r2: 4, r3: 2, r4: 1 };
  }

  override onParam(id: string): void {
    if (id === 'bpm' || id === 'run') this.dirty = true;
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const x1 = O[0]?.[0];
    const x2 = O[1]?.[0];
    const d2 = O[2]?.[0];
    const d4 = O[3]?.[0];
    const rec = O[4]?.[0];
    if (!x1 || !x2 || !d2 || !d4 || !rec) return true;
    const rst = ch(I, 0);
    const ss = ch(I, 1);
    const p = this.p;
    const run = p.run ?? 0;
    const recLen = (sampleRate * 0.005) | 0;

    if (!this.initd) {
      this.running = run !== 0;
      this.prevRunSw = run;
      this.initd = true;
    }
    // A RUN-switch flip is an explicit transport set and overrides the current state.
    if (run !== this.prevRunSw) {
      if (run && !this.running) this.recHold = recLen;
      this.running = run !== 0;
      this.prevRunSw = run;
    }

    const m1 = RATE_MULT[Math.round(p.r1 ?? 3)] ?? 1;
    const m2 = RATE_MULT[Math.round(p.r2 ?? 4)] ?? 1;
    const m3 = RATE_MULT[Math.round(p.r3 ?? 2)] ?? 1;
    const m4 = RATE_MULT[Math.round(p.r4 ?? 1)] ?? 1;
    const dt = (p.bpm ?? 120) / 60 / sampleRate;

    for (let i = 0; i < x1.length; i++) {
      const r = rst?.[i] ?? 0;
      if (r > 2.5 && this.prst <= 2.5) this.b = 0;
      this.prst = r;
      const s = ss?.[i] ?? 0;
      if (s > 2.5 && this.pss <= 2.5) {
        this.running = !this.running;
        if (this.running) this.recHold = recLen;
        this.dirty = true;
      }
      this.pss = s;

      if (this.running) this.b += dt;
      x1[i] = this.gate(m1);
      x2[i] = this.gate(m2);
      d2[i] = this.gate(m3);
      d4[i] = this.gate(m4);
      rec[i] = this.recHold > 0 ? 5 : 0;
      if (this.recHold > 0) this.recHold--;
    }
    if (this.dirty) {
      this.dirty = false;
      this.port.postMessage({
        t: 'text',
        v: `${Math.round(p.bpm ?? 120)} BPM ${this.running ? 'RUN' : 'STOP'}`,
      });
    }
    return true;
  }

  /** 50% duty pulse at `mult` times the beat rate. */
  gate(mult: number): number {
    return this.running && (this.b * mult) % 1 < 0.5 ? 5 : 0;
  }
}

registerProcessor('clock', Clock);
