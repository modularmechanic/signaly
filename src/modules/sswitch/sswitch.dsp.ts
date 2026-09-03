import { Base, ch, clamp, type Params } from '../../engine/dsp-prelude';

const LED_IDS = ['s1', 's2', 's3', 's4'];

/** Sequential switch. 1→4 fans IN 1 out across OUT 1–4; 4→1 collects IN 1–4 into OUT 1.
    The unselected outputs sit at 0 V, so a patched but idle channel is silent. */
class SSwitch extends Base {
  step = 0;
  lastClk = 0;
  lastRst = 0;
  led = -1;

  defaults(): Params {
    return { steps: 4, dir: 0 };
  }

  private lamp(index: number, v: number): void {
    const id = LED_IDS[index];
    if (id) this.port.postMessage({ t: 'led', id, v });
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const o1 = O[0]?.[0];
    const o2 = O[1]?.[0];
    const o3 = O[2]?.[0];
    const o4 = O[3]?.[0];
    if (!o1 || !o2 || !o3 || !o4) return true;
    const clk = ch(I, 0);
    const rst = ch(I, 1);
    const src = [ch(I, 2), ch(I, 3), ch(I, 4), ch(I, 5)];
    const n = clamp(Math.round(this.p.steps ?? 4), 2, 4);
    const fanOut = Math.round(this.p.dir ?? 0) === 0;
    for (let i = 0; i < o1.length; i++) {
      const r = rst?.[i] ?? 0;
      if (r > 2.5 && this.lastRst <= 2.5) this.step = 0;
      this.lastRst = r;
      const c = clk?.[i] ?? 0;
      if (c > 2.5 && this.lastClk <= 2.5) this.step = (this.step + 1) % n;
      this.lastClk = c;
      const active = this.step % n;
      if (fanOut) {
        const x = src[0]?.[i] ?? 0;
        o1[i] = active === 0 ? x : 0;
        o2[i] = active === 1 ? x : 0;
        o3[i] = active === 2 ? x : 0;
        o4[i] = active === 3 ? x : 0;
      } else {
        o1[i] = src[active]?.[i] ?? 0;
        o2[i] = 0;
        o3[i] = 0;
        o4[i] = 0;
      }
    }
    if (this.step !== this.led) {
      if (this.led >= 0) this.lamp(this.led, 0);
      this.lamp(this.step, 1);
      this.led = this.step;
    }
    return true;
  }
}

registerProcessor('sswitch', SSwitch);
