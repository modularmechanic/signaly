import {
  Base,
  ch,
  clamp,
  flush,
  ClockSync,
  DL,
  OnePole,
  SYNC_DIV,
  lpCoeff,
  type Params,
} from '../../engine/dsp-prelude';

class DDelay extends Base {
  d = new DL(sampleRate * 4);
  lp = 0;
  /** Delay-time glide, 20.8229 ms (the old raw 0.001/sample @48k). */
  t = new OnePole(20.8229, 0.375 * sampleRate);
  cs = new ClockSync();
  led = 0;

  defaults(): Params {
    return { time: 0.375, fb: 0.35, mix: 0.35, tone: 4000, sync: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      tcv = ch(I, 1),
      fcv = ch(I, 2),
      tocv = ch(I, 3),
      mcv = ch(I, 4),
      clk = ch(I, 5);
    const out = O[0]?.[0];
    if (!out) return true;
    const p = this.p;
    const sync = p.sync ?? 0;
    let lit = 0;
    for (let i = 0; i < out.length; i++) {
      const x = inp?.[i] ?? 0;
      const c = clk?.[i] ?? 0;
      const per = this.cs.tick(c);
      if (c > 2.5) lit = 1;
      const tone = clamp((p.tone ?? 4000) * Math.pow(2, (tocv?.[i] ?? 0) / 5), 150, 17000);
      const tc = lpCoeff(tone);
      // synced time (division of the incoming clock pulse) or free-run TIME knob
      const tt =
        sync > 0 && per > 0
          ? clamp((per / sampleRate) * (SYNC_DIV[sync] ?? 1), 0.005, 3.9)
          : clamp((p.time ?? 0.375) * Math.pow(2, -(tcv?.[i] ?? 0) / 5), 0.005, 3.9);
      let y = this.d.read(this.t.process(tt * sampleRate));
      this.lp = flush(this.lp + (y - this.lp) * tc); // tone state is inside the feedback loop
      y = this.lp;
      const fb = clamp((p.fb ?? 0.35) + (fcv?.[i] ?? 0) / 5, 0, 0.99);
      const mix = clamp((p.mix ?? 0.35) + (mcv?.[i] ?? 0) / 5, 0, 1);
      this.d.push(x + clamp(y * fb, -6, 6));
      out[i] = x * (1 - mix) + y * mix;
    }
    // Sync LED: posted at block rate on change only, but the gate is detected
    // anywhere in the block so a pulse starting mid-block still lights it.
    if (lit !== this.led) {
      this.led = lit;
      this.port.postMessage({ t: 'led', id: 'clk', v: lit });
    }

    return true;
  }
}
registerProcessor('ddelay', DDelay);
