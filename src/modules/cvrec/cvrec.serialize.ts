import type { ModuleInstance, SerializeSpec } from '../../engine/types';

/** 24 ppq * 4 beats/bar * 16 bars — the hard cap on the recording, regardless of LENGTH. */
export const CAP = 24 * 4 * 16;

export interface CvRecExt {
  buf: number[];
}

const seed = (): CvRecExt => ({ buf: new Array(CAP).fill(0) as number[] });

/** The live recording on `m.ext.cvrec`, seeded on first read. Kept in sync with the
    processor's own buffer via the `{t:'rec', i, v}` message it posts on every write. */
export function getRec(m: ModuleInstance): CvRecExt {
  const ext = m.ext as { cvrec?: CvRecExt };
  ext.cvrec ??= seed();
  return ext.cvrec;
}

export const serialize: SerializeSpec = {
  save: (m) => ({ buf: getRec(m).buf.slice() }),

  // Runs on untrusted imported patch JSON: bounded, total, never throws.
  validate: (o) => {
    if (typeof o !== 'object' || o === null) return false;
    const buf = (o as { buf?: unknown }).buf;
    return (
      Array.isArray(buf) &&
      buf.length === CAP &&
      buf.every((v) => typeof v === 'number' && Number.isFinite(v))
    );
  },

  load: (m, o) => {
    if (!serialize.validate?.(o)) return;
    const buf = (o as CvRecExt).buf.slice();
    (m.ext as { cvrec?: CvRecExt }).cvrec = { buf };
    m.node?.port.postMessage({ t: 'load', buf });
  },
};
