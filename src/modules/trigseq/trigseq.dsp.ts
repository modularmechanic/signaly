import { Base, ch, clamp, type InMsg, type Params } from '../../engine/dsp-prelude';

const LANES = 4;
const STEPS = 16;

/** TRIG SEQ — four independent trigger lanes, each with its own LENGTH (polymeter): a
    lane of length 3 against one of length 4 realigns every 12 clocks (their LCM).
    In: `{t:'cell', lane, i, v}` (single edit) or `{t:'grid', v: (0|1)[][]}` (patch load). */
class TrigSeq extends Base {
  hits: number[][] = Array.from({ length: LANES }, () => new Array(STEPS).fill(0) as number[]);
  pos = [0, 0, 0, 0];
  lc = 0;
  lr = 0;

  defaults(): Params {
    return { len1: STEPS, len2: STEPS, len3: STEPS, len4: STEPS };
  }

  override msg(m: InMsg): void {
    if (m.t === 'cell') {
      const lane = Math.round(Number(m.lane));
      const i = Math.round(Number(m.i));
      if (!Number.isFinite(lane) || lane < 0 || lane >= LANES) return;
      if (!Number.isFinite(i) || i < 0 || i >= STEPS) return;
      const row = this.hits[lane];
      if (row && typeof m.v === 'number') row[i] = m.v ? 1 : 0;
    } else if (m.t === 'grid' && Array.isArray(m.v)) {
      const rows = m.v as unknown[];
      for (let l = 0; l < LANES; l++) {
        const src = rows[l];
        const dst = this.hits[l];
        if (!Array.isArray(src) || !dst) continue;
        for (let i = 0; i < STEPS; i++) {
          const v = src[i];
          if (typeof v === 'number') dst[i] = v ? 1 : 0;
        }
      }
    }
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const outs = [O[0]?.[0], O[1]?.[0], O[2]?.[0], O[3]?.[0]];
    if (outs.some((o) => !o)) return true;
    const clk = ch(I, 0);
    const rst = ch(I, 1);
    const p = this.p;
    const lens = [p.len1, p.len2, p.len3, p.len4].map((v) => clamp(Math.round(v ?? STEPS), 1, STEPS));
    const n = outs[0]!.length;
    for (let i = 0; i < n; i++) {
      const r = rst?.[i] ?? 0;
      if (r > 2.5 && this.lr <= 2.5) this.pos = [0, 0, 0, 0];
      this.lr = r;
      const c = clk?.[i] ?? 0;
      if (c > 2.5 && this.lc <= 2.5) {
        for (let l = 0; l < LANES; l++) this.pos[l] = ((this.pos[l] ?? 0) + 1) % (lens[l] ?? STEPS);
      }
      this.lc = c;
      const hi = c > 2.5;
      for (let l = 0; l < LANES; l++) {
        const row = this.hits[l];
        outs[l]![i] = hi && row?.[this.pos[l] ?? 0] ? 5 : 0;
      }
    }
    return true;
  }
}

registerProcessor('trigseq', TrigSeq);
