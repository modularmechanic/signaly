import { describe, expect, it } from 'vitest';
import { loadProcessor, SR } from '../../../tests/dsp-harness';

/** RMS of the second half of an 8 kHz tone at the given BANDWIDTH. */
async function hfEnergy(bw: number): Promise<number> {
  const m = await loadProcessor('lofi');
  m.p.bw = bw;
  m.p.wow = 0;
  m.p.hiss = 0;
  m.p.crackle = 0;
  m.p.mix = 1;
  const n = 4800;
  const inp = new Float32Array(n);
  for (let i = 0; i < n; i++) inp[i] = Math.sin((2 * Math.PI * 8000 * i) / SR) * 4;
  const O = [[new Float32Array(n)]];
  m.process([[inp]], O);
  const y = O[0]![0]!;
  let sum = 0;
  for (let i = n / 2; i < n; i++) sum += y[i]! * y[i]!;
  return Math.sqrt(sum / (n / 2));
}

/** RMS of the whole output for silent input at the given HISS. */
async function noiseFloor(hiss: number): Promise<number> {
  const m = await loadProcessor('lofi');
  m.p.hiss = hiss;
  m.p.wow = 0;
  m.p.crackle = 0;
  m.p.bw = 18000;
  m.p.mix = 1;
  const n = 4800;
  const inp = new Float32Array(n);
  const O = [[new Float32Array(n)]];
  m.process([[inp]], O);
  const y = O[0]![0]!;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += y[i]! * y[i]!;
  return Math.sqrt(sum / n);
}

describe('lofi.dsp', () => {
  it('passes fully dry input through unchanged at mix 0', async () => {
    const m = await loadProcessor('lofi');
    m.p.mix = 0;
    m.p.hiss = 1;
    m.p.wow = 1;
    m.p.crackle = 1;
    m.p.bw = 300;
    const inp = new Float32Array([1, -2, 3, -4, 0.5]);
    const O = [[new Float32Array(5)]];
    m.process([[inp]], O);
    expect(Array.from(O[0]![0]!)).toEqual(Array.from(inp));
  });

  it('narrows bandwidth and adds a hiss noise floor', async () => {
    expect(await hfEnergy(18000)).toBeGreaterThan((await hfEnergy(400)) * 2);
    expect(await noiseFloor(0.8)).toBeGreaterThan((await noiseFloor(0)) + 0.1);
  });
});
