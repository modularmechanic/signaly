import { del, get, set } from 'idb-keyval';
import { getAudioContext } from '../engine/audio-context';

// Same pattern as image-store.ts: a loaded sample is a Blob, far past localStorage's budget.
const key = (id: string): string => `sample:${id}`;

export const MAX_SAMPLE_BYTES = 20 * 1024 * 1024;
export const MAX_SAMPLE_SECONDS = 60;

export function newSampleId(): string {
  return crypto.randomUUID();
}

export function saveSample(id: string, blob: Blob): Promise<void> {
  return set(key(id), blob);
}

export function getSample(id: string): Promise<Blob | undefined> {
  return get<Blob>(key(id));
}

export function removeSample(id: string): Promise<void> {
  return del(key(id));
}

export interface DecodedSample {
  data: Float32Array;
  duration: number;
}

/** Pure guard, checked before AND after decode — testable without a real decoder. */
export function sampleLimitError(bytes: number, seconds?: number): string | null {
  if (bytes > MAX_SAMPLE_BYTES) return `File is larger than ${MAX_SAMPLE_BYTES / (1024 * 1024)} MB.`;
  if (seconds !== undefined && seconds > MAX_SAMPLE_SECONDS) {
    return `Sample is longer than ${MAX_SAMPLE_SECONDS} s.`;
  }
  return null;
}

function mixToMono(buf: AudioBuffer): Float32Array {
  const out = new Float32Array(buf.length);
  const n = buf.numberOfChannels || 1;
  for (let c = 0; c < n; c++) {
    const data = buf.getChannelData(c);
    for (let i = 0; i < out.length; i++) out[i] = (out[i] ?? 0) + (data[i] ?? 0) / n;
  }
  return out;
}

/** Decode a file through the real AudioContext and mix to mono. Never throws — every
    failure (too large, undecodable, too long) comes back as `{ error }`. */
export async function decodeSample(blob: Blob): Promise<DecodedSample | { error: string }> {
  const sizeErr = sampleLimitError(blob.size);
  if (sizeErr) return { error: sizeErr };
  let audioBuf: AudioBuffer;
  try {
    audioBuf = await getAudioContext().decodeAudioData(await blob.arrayBuffer());
  } catch {
    return { error: 'That file could not be decoded as audio.' };
  }
  const durErr = sampleLimitError(blob.size, audioBuf.duration);
  if (durErr) return { error: durErr };
  return { data: mixToMono(audioBuf), duration: audioBuf.duration };
}
