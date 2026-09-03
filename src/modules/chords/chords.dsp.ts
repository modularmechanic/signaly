import { Base, ch, clamp, type Params } from '../../engine/dsp-prelude';

/** Semitone offsets above the root for each of 4 voices. Index matches the TYPE knob's
    `fChord` labels: MAJ MIN MAJ7 MIN7 DOM7 SUS4 DIM7 AUG 5TH, then the first 4 degrees
    of MAJ SC / MIN SC / PENTA for the three scale-flavoured entries. */
const CHORDS: readonly (readonly number[])[] = [
  [0, 4, 7, 12], // MAJ
  [0, 3, 7, 12], // MIN
  [0, 4, 7, 11], // MAJ7
  [0, 3, 7, 10], // MIN7
  [0, 4, 7, 10], // DOM7
  [0, 5, 7, 12], // SUS4
  [0, 3, 6, 9], // DIM7
  [0, 4, 8, 12], // AUG
  [0, 7, 12, 19], // 5TH
  [0, 2, 4, 5], // MAJ SC
  [0, 2, 3, 5], // MIN SC
  [0, 2, 4, 7], // PENTA
];

/** CHORD — a passive voicing expander: ROOT in 1V/oct, four voices out at once. No clock,
    no state; every sample is the chord table read straight through. */
class Chords extends Base {
  defaults(): Params {
    return { type: 0, inv: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const outs = [O[0]?.[0], O[1]?.[0], O[2]?.[0], O[3]?.[0]];
    if (outs.some((o) => !o)) return true;
    const inp = ch(I, 0);
    const p = this.p;
    const table = CHORDS[clamp(Math.round(p.type ?? 0), 0, CHORDS.length - 1)] ?? CHORDS[0]!;
    const inv = clamp(Math.round(p.inv ?? 0), 0, 3);
    // INVERSION rotates the voicing: the lowest `inv` notes move up an octave.
    const offsets = [0, 1, 2, 3].map((j) => {
      const idx = (j + inv) % 4;
      const oct = Math.floor((j + inv) / 4);
      return (table[idx] ?? 0) + 12 * oct;
    });
    const n = outs[0]!.length;
    for (let i = 0; i < n; i++) {
      const root = inp?.[i] ?? 0;
      for (let v = 0; v < 4; v++) outs[v]![i] = clamp(root + (offsets[v] ?? 0) / 12, -5, 5);
    }
    return true;
  }
}

registerProcessor('chords', Chords);
