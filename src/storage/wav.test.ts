import { describe, expect, it } from 'vitest';
import { encodeWav, toInt16, wavSeconds, type Samples } from './wav';

const bytes = async (b: Blob): Promise<DataView> => new DataView(await b.arrayBuffer());
const ascii = (v: DataView, at: number, n: number): string =>
  Array.from({ length: n }, (_, i) => String.fromCharCode(v.getUint8(at + i))).join('');

describe('toInt16', () => {
  it('maps full scale to full scale', () => {
    expect(Array.from(toInt16(new Float32Array([0, 1, -1])))).toEqual([0, 32767, -32767]);
  });

  it('clamps rather than wrapping, so a hot take stays clipped instead of folding to noise', () => {
    expect(Array.from(toInt16(new Float32Array([2, -3])))).toEqual([32767, -32767]);
  });
});

describe('encodeWav', () => {
  const chunk = (...v: number[]): Samples => Int16Array.from(v) as Samples;

  it('writes a RIFF/WAVE header that describes the samples that follow', async () => {
    const v = await bytes(encodeWav([chunk(1, -1, 2, -2)], 2, 48000));
    expect(ascii(v, 0, 4)).toBe('RIFF');
    expect(ascii(v, 8, 4)).toBe('WAVE');
    expect(ascii(v, 12, 4)).toBe('fmt ');
    expect(v.getUint16(20, true)).toBe(1); // uncompressed PCM
    expect(v.getUint16(22, true)).toBe(2); // stereo
    expect(v.getUint32(24, true)).toBe(48000);
    expect(v.getUint32(28, true)).toBe(48000 * 2 * 2); // byte rate
    expect(v.getUint16(32, true)).toBe(4); // block align
    expect(v.getUint16(34, true)).toBe(16); // bit depth
    expect(ascii(v, 36, 4)).toBe('data');
    expect(v.getUint32(40, true)).toBe(8); // four samples, two bytes each
    expect(v.getUint32(4, true)).toBe(36 + 8); // RIFF size covers the rest of the file
    expect(v.byteLength).toBe(44 + 8);
  });

  it('concatenates every chunk in order', async () => {
    const v = await bytes(encodeWav([chunk(1, 2), chunk(3, 4)], 2, 48000));
    expect([0, 1, 2, 3].map((i) => v.getInt16(44 + i * 2, true))).toEqual([1, 2, 3, 4]);
  });

  it('still writes a valid empty file', async () => {
    const v = await bytes(encodeWav([], 2, 48000));
    expect(v.byteLength).toBe(44);
    expect(v.getUint32(40, true)).toBe(0);
  });
});

describe('wavSeconds', () => {
  it('counts interleaved samples as frames per channel', () => {
    const oneSecondStereo = new Int16Array(48000 * 2) as Samples;
    expect(wavSeconds([oneSecondStereo], 2, 48000)).toBe(1);
    expect(wavSeconds([], 2, 48000)).toBe(0);
  });
});
