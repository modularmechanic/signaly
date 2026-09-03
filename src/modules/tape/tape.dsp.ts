import { Base, ch, clamp, ClockSync, DL, OnePole, SYNC_DIV, TP, type Params } from '../../engine/dsp-prelude';

class Tape extends Base {
  d = new DL(sampleRate * 3);
  // Time constants in ms, each reproducing its former raw @48k coefficient
  // (0.0006 / 0.22 / 0.004) but now identical in real time at any rate.
  t = new OnePole(34.7118, 0.42 * sampleRate);
  lp = new OnePole(0.0838494);
  hp = new OnePole(5.19791);
  cs = new ClockSync();
  led = 0;
  ph = 0;
  ph2 = 0;

  defaults(): Params {
    return { time: 0.42, fb: 0.45, mix: 0.4, wow: 0.4, sat: 1.6, sync: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      tcv = ch(I, 1),
      fcv = ch(I, 2),
      wcv = ch(I, 3),
      scv = ch(I, 4),
      mcv = ch(I, 5),
      clk = ch(I, 6);
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
      this.ph += 0.6 / sampleRate;
      if (this.ph > 1) this.ph -= 1; // wow
      this.ph2 += 6.3 / sampleRate;
      if (this.ph2 > 1) this.ph2 -= 1; // flutter
      const wow = clamp((p.wow ?? 0.4) + (wcv?.[i] ?? 0) / 5, 0, 1.4);
      const modS = (Math.sin(TP * this.ph) * 0.004 + Math.sin(TP * this.ph2) * 0.0007) * wow * sampleRate;
      const tt =
        sync > 0 && per > 0
          ? clamp((per / sampleRate) * (SYNC_DIV[sync] ?? 1), 0.02, 2.8)
          : clamp((p.time ?? 0.42) * Math.pow(2, -(tcv?.[i] ?? 0) / 5), 0.02, 2.8);
      let y = this.d.read(this.t.process(tt * sampleRate) + modS);
      y = this.lp.process(y); // head bump-ish LP
      y = y - this.hp.process(y); // loop HP
      const sat = clamp((p.sat ?? 1.6) * Math.pow(2, (scv?.[i] ?? 0) / 5), 0.3, 8);
      // REGEN goes past unity by design; this tanh stage bounds the loop to ±5V.
      y = (Math.tanh((y * sat) / 5) * 5) / Math.max(1, sat * 0.7);
      const fb = clamp((p.fb ?? 0.45) + (fcv?.[i] ?? 0) / 5, 0, 1.15);
      const mix = clamp((p.mix ?? 0.4) + (mcv?.[i] ?? 0) / 5, 0, 1);
      this.d.push(x + y * fb);
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
registerProcessor('tape', Tape);
