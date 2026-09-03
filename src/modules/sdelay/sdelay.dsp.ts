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

const GLIDE_MS = 20.8229;

class SDelay extends Base {
  dL = new DL(sampleRate * 4);
  dR = new DL(sampleRate * 4);
  lpL = 0;
  lpR = 0;
  tL = new OnePole(GLIDE_MS, 0.375 * sampleRate);
  tR = new OnePole(GLIDE_MS, 0.5 * sampleRate);
  cs = new ClockSync();
  led = 0;

  defaults(): Params {
    return {
      timel: 0.375,
      timer: 0.5,
      fb: 0.4,
      swing: 0,
      tone: 5000,
      width: 0.85,
      mix: 0.35,
      mode: 0,
      sync: 0,
    };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const iL = ch(I, 0),
      iR = ch(I, 1),
      tcv = ch(I, 2),
      fcv = ch(I, 3),
      mcv = ch(I, 4),
      clk = ch(I, 5);
    const L = O[0]?.[0],
      R = O[1]?.[0];
    if (!L || !R) return true;
    const p = this.p;
    const sync = p.sync ?? 0;
    const mode = p.mode ?? 0;
    const swing = p.swing ?? 0;
    const width = clamp(p.width ?? 0.85, 0, 1);
    const tc = lpCoeff(clamp(p.tone ?? 5000, 150, 17000));
    let lit = 0;
    for (let i = 0; i < L.length; i++) {
      const xL = iL?.[i] ?? 0;
      const xR = iR?.[i] ?? 0;
      const c = clk?.[i] ?? 0;
      const per = this.cs.tick(c);
      if (c > 2.5) lit = 1;
      // synced base (a division of one clock pulse) or the free-run TIME knobs (+TIME CV)
      const synced = sync > 0 && per > 0;
      const syncT = clamp((per / sampleRate) * (SYNC_DIV[sync] ?? 1), 0.005, 3.9);
      const cvT = Math.pow(2, (tcv?.[i] ?? 0) / 5);
      const baseL = synced ? syncT : clamp((p.timel ?? 0.375) * cvT, 0.005, 3.9);
      const baseR = synced ? syncT : clamp((p.timer ?? 0.5) * cvT, 0.005, 3.9);
      // swing lengthens the right line for a shuffled bounce
      const swungR = clamp(baseR * (1 + swing), 0.005, 3.9);
      // read both lines, tone-filter inside the loop (so the tone states are
      // denormal-flushed along with the lines themselves)
      let yL = this.dL.read(this.tL.process(baseL * sampleRate));
      let yR = this.dR.read(this.tR.process(swungR * sampleRate));
      this.lpL = flush(this.lpL + (yL - this.lpL) * tc);
      yL = this.lpL;
      this.lpR = flush(this.lpR + (yR - this.lpR) * tc);
      yR = this.lpR;
      const fb = clamp((p.fb ?? 0.4) + (fcv?.[i] ?? 0) / 5, 0, 0.95);
      // routing: STEREO=straight, PINGPONG=feedback crosses, CROSS=input crosses
      const srcL = mode === 2 ? xR : xL;
      const srcR = mode === 2 ? xL : xR;
      const fbL = mode === 1 ? yR : yL;
      const fbR = mode === 1 ? yL : yR;
      this.dL.push(srcL + clamp(fbL * fb, -6, 6));
      this.dR.push(srcR + clamp(fbR * fb, -6, 6));
      // WIDTH blends mono-summed wet (0) toward full stereo (1)
      const monoW = (yL + yR) * 0.5;
      const mix = clamp((p.mix ?? 0.35) + (mcv?.[i] ?? 0) / 5, 0, 1);
      L[i] = xL * (1 - mix) + (monoW + (yL - monoW) * width) * mix;
      R[i] = xR * (1 - mix) + (monoW + (yR - monoW) * width) * mix;
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
registerProcessor('sdelay', SDelay);
