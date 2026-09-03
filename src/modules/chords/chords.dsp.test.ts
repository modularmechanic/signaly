import { beforeAll, describe, expect, it, vi } from 'vitest';

class FakeProcessor {
  port = { onmessage: null, postMessage: (): void => {} };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
  p: Record<string, number>;
}
let Chords: new () => Proc;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', 48000);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./chords.dsp');
  Chords = reg.mock.calls[0]![1] as new () => Proc;
});

/** All 4 voice outs for a constant root voltage. */
function voices(root: number, type: number, inv = 0): number[] {
  const c = new Chords();
  c.p.type = type;
  c.p.inv = inv;
  const O = [0, 1, 2, 3].map(() => [new Float32Array(4)]);
  c.process([[new Float32Array(4).fill(root)]], O);
  return O.map((o) => o[0]![3]!);
}

describe('chords.dsp', () => {
  it('outputs the chord table as 1V/oct semitone offsets above the root', () => {
    // MAJ: 0, +4, +7, +12 semitones -> volts = semitones / 12.
    const maj = voices(0, 0);
    expect(maj[0]).toBeCloseTo(0, 5);
    expect(maj[1]).toBeCloseTo(4 / 12, 5);
    expect(maj[2]).toBeCloseTo(7 / 12, 5);
    expect(maj[3]).toBeCloseTo(12 / 12, 5);

    // MIN7 (index 3): 0, +3, +7, +10, offset by a nonzero root.
    const min7 = voices(1, 3);
    expect(min7[0]).toBeCloseTo(1, 5);
    expect(min7[1]).toBeCloseTo(1 + 3 / 12, 5);
    expect(min7[2]).toBeCloseTo(1 + 7 / 12, 5);
    expect(min7[3]).toBeCloseTo(1 + 10 / 12, 5);
  });

  it('keeps every inversion strictly ascending, never doubling a pitch', () => {
    // MAJ inv 1: the root wraps above the octave already in the table -> 4 7 12 24, not 4 7 12 12.
    const maj1 = voices(0, 0, 1).map((v) => Math.round(v * 12));
    expect(maj1).toEqual([4, 7, 12, 24]);
    // 5TH (0 7 12 19) inv 1 -> 7 12 19 24.
    expect(voices(0, 8, 1).map((v) => Math.round(v * 12))).toEqual([7, 12, 19, 24]);
    for (let type = 0; type < 12; type++)
      for (let inv = 0; inv < 4; inv++) {
        const v = voices(0, type, inv);
        for (let k = 1; k < 4; k++) expect(v[k]!, `type ${type} inv ${inv}`).toBeGreaterThan(v[k - 1]!);
      }
  });
});
