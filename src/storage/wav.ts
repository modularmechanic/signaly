/** Minimal 16-bit PCM WAV writer. Enough for the recorder and nothing more: no compression, no
    metadata chunks, no resampling — a header and the samples exactly as the engine produced them. */

const BYTES_PER_SAMPLE = 2;

/** Backed by a plain ArrayBuffer, not a shared one: `Blob` will not take a SharedArrayBuffer view. */
export type Samples = Int16Array<ArrayBuffer>;

/** Total interleaved samples across every chunk. */
const total = (chunks: Samples[]): number => chunks.reduce((n, c) => n + c.length, 0);

/** Float samples in -1..1 to 16-bit, clamped rather than wrapped: a clipped record should sound
    clipped, not fold over into noise. */
export function toInt16(src: Float32Array): Samples {
  const out = new Int16Array(src.length);
  for (let i = 0; i < src.length; i++) {
    const v = src[i] ?? 0;
    const c = v > 1 ? 1 : v < -1 ? -1 : v;
    out[i] = Math.round(c * 32767);
  }
  return out;
}

/** RIFF/WAVE around already-interleaved 16-bit samples. */
export function encodeWav(chunks: Samples[], channels: number, sampleRate: number): Blob {
  const samples = total(chunks);
  const dataBytes = samples * BYTES_PER_SAMPLE;
  const header = new ArrayBuffer(44);
  const v = new DataView(header);
  const ascii = (at: number, s: string): void => {
    for (let i = 0; i < s.length; i++) v.setUint8(at + i, s.charCodeAt(i));
  };
  ascii(0, 'RIFF');
  v.setUint32(4, 36 + dataBytes, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  v.setUint32(16, 16, true); // PCM header length
  v.setUint16(20, 1, true); // format: uncompressed PCM
  v.setUint16(22, channels, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * channels * BYTES_PER_SAMPLE, true); // byte rate
  v.setUint16(32, channels * BYTES_PER_SAMPLE, true); // block align
  v.setUint16(34, 8 * BYTES_PER_SAMPLE, true);
  ascii(36, 'data');
  v.setUint32(40, dataBytes, true);
  return new Blob([header, ...chunks], { type: 'audio/wav' });
}

/** Seconds of audio held in `chunks`, for the recorder's readout. */
export const wavSeconds = (chunks: Samples[], channels: number, sampleRate: number): number =>
  total(chunks) / Math.max(1, channels * sampleRate);
