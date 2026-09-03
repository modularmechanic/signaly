import { Base, ch, clamp, OnePole, type Params } from '../../engine/dsp-prelude';

/** SHIFT REG — samples IN on each clock and shifts it down four stages: OUT 4 is OUT 1
    delayed by three clocks, the classic canon/bucket-brigade CV move. SLEW adds optional
    portamento between stages (near-zero by default: an immediate sample & hold). */
class Shift extends Base {
  s = [0, 0, 0, 0];
  filt = [new OnePole(), new OnePole(), new OnePole(), new OnePole()];
  lc = 0;

  defaults(): Params {
    return { slew: 0.0005 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const outs = [O[0]?.[0], O[1]?.[0], O[2]?.[0], O[3]?.[0]];
    if (outs.some((o) => !o)) return true;
    const inp = ch(I, 0);
    const clk = ch(I, 1);
    const tau = Math.max(0.0005, this.p.slew ?? 0.0005);
    for (const f of this.filt) f.setTau(tau);
    const n = outs[0]!.length;
    for (let i = 0; i < n; i++) {
      const c = clk?.[i] ?? 0;
      if (c > 2.5 && this.lc <= 2.5) {
        this.s[3] = this.s[2]!;
        this.s[2] = this.s[1]!;
        this.s[1] = this.s[0]!;
        this.s[0] = clamp(inp?.[i] ?? 0, -5, 5);
      }
      this.lc = c;
      for (let k = 0; k < 4; k++) outs[k]![i] = this.filt[k]!.process(this.s[k]!);
    }
    return true;
  }
}

registerProcessor('shift', Shift);
