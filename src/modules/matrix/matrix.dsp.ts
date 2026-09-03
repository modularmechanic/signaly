// 4 x 4 matrix mixer: every input has its own level into every bus, sixteen cells in all.
// Levels are read once per block into a flat 16-slot table (input-major, the panel order).
import { Base, ch, clamp, type Params } from '../../engine/dsp-prelude';

const ROWS = ['a', 'b', 'c', 'd'] as const;
const N = 4;
const MAX_V = 5;

const CELLS: string[] = ROWS.flatMap((r) => [1, 2, 3, 4].map((n) => `${r}${n}`));

class Matrix extends Base {
  g = new Float32Array(N * N);

  defaults(): Params {
    const p: Params = {};
    for (const id of CELLS) p[id] = 0;
    return p;
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const out = [O[0]?.[0], O[1]?.[0], O[2]?.[0], O[3]?.[0]];
    const first = out[0];
    if (!first || !out[1] || !out[2] || !out[3]) return true;
    const ins = [ch(I, 0), ch(I, 1), ch(I, 2), ch(I, 3)];
    for (let k = 0; k < CELLS.length; k++) this.g[k] = clamp(this.p[CELLS[k]!] ?? 0, 0, 1);
    for (let i = 0; i < first.length; i++) {
      for (let bus = 0; bus < N; bus++) {
        let s = 0;
        for (let src = 0; src < N; src++) {
          const g = this.g[src * N + bus]!;
          if (g !== 0) s += (ins[src]?.[i] ?? 0) * g;
        }
        out[bus]![i] = clamp(s, -MAX_V, MAX_V);
      }
    }
    return true;
  }
}

registerProcessor('matrix', Matrix);
