import { Base, ch, clamp, Lcg, type Params } from '../../engine/dsp-prelude';

const LED_IDS = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8'] as const;

/** The looping shift register. PROBABILITY is the chance the recycled bit survives
    unchanged: 1 locks the loop, 0 locks it inverted (period 2xLENGTH), 0.5 is white. */
class Turing extends Base {
  reg = 0b1011001110100101;
  rng = new Lcg(0x5eed01);
  lastClk = 0;
  led = 0;

  defaults(): Params {
    return { prob: 1, len: 8, scale: 2, offset: 0 };
  }

  /** Uniform 0..1 from the shared prelude RNG. */
  rnd(): number {
    return (this.rng.next() + 1) / 2;
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const cvOut = O[0]?.[0];
    const gate = O[1]?.[0];
    const inv = O[2]?.[0];
    if (!cvOut || !gate || !inv) return true;
    const clk = ch(I, 0);
    const pcv = ch(I, 1);
    const p = this.p;
    const n = clamp(Math.round(p.len ?? 8), 2, 16);
    const scale = clamp(p.scale ?? 2, 0, 5);
    const offset = clamp(p.offset ?? 0, -5, 5);
    const mask = (1 << n) - 1;
    for (let i = 0; i < cvOut.length; i++) {
      const c = clk?.[i] ?? 0;
      if (c > 2.5 && this.lastClk <= 2.5) {
        const keep = clamp((p.prob ?? 1) + (pcv?.[i] ?? 0) / 5, 0, 1);
        let bit = (this.reg >> (n - 1)) & 1;
        if (this.rnd() >= keep) bit ^= 1;
        this.reg = ((this.reg << 1) | bit) & mask;
      }
      this.lastClk = c;
      const hi = c > 2.5;
      const on = (this.reg & 1) === 1;
      // Low 8 bits read as an unsigned byte: the classic 8-step voltage pattern.
      cvOut[i] = clamp(offset + ((this.reg & 0xff) / 255) * scale, -5, 5);
      gate[i] = hi && on ? 5 : 0;
      inv[i] = hi && !on ? 5 : 0;
    }
    const bits = this.reg & 0xff;
    if (bits !== this.led) {
      for (let b = 0; b < 8; b++) {
        if (((bits >> b) & 1) !== ((this.led >> b) & 1)) {
          this.port.postMessage({ t: 'led', id: LED_IDS[b], v: (bits >> b) & 1 });
        }
      }
      this.led = bits;
    }
    return true;
  }
}

registerProcessor('turing', Turing);
