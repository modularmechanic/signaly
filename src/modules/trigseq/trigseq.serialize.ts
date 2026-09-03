import type { ModuleInstance, SerializeSpec } from '../../engine/types';

export const LANES = 4;
export const STEPS = 16;

export interface TrigSeqExt {
  lanes: (0 | 1)[][];
}

const seed = (): TrigSeqExt => ({
  lanes: Array.from({ length: LANES }, () => new Array(STEPS).fill(0) as (0 | 1)[]),
});

/** The live 4-lane hit grid on `m.ext.trigseq`, seeded on first read. */
export function getTrig(m: ModuleInstance): TrigSeqExt {
  const ext = m.ext as { trigseq?: TrigSeqExt };
  ext.trigseq ??= seed();
  return ext.trigseq;
}

/** Mirror the whole grid into the running processor. */
export function pushTrig(m: ModuleInstance, s: TrigSeqExt): void {
  m.node?.port.postMessage({ t: 'grid', v: s.lanes });
}

export const serialize: SerializeSpec = {
  save: (m) => ({ lanes: getTrig(m).lanes.map((row) => row.slice()) }),

  // Runs on untrusted imported patch JSON: bounded, total, never throws.
  validate: (o) => {
    if (typeof o !== 'object' || o === null) return false;
    const lanes = (o as { lanes?: unknown }).lanes;
    if (!Array.isArray(lanes) || lanes.length !== LANES) return false;
    return lanes.every(
      (row) => Array.isArray(row) && row.length === STEPS && row.every((v) => v === 0 || v === 1),
    );
  },

  load: (m, o) => {
    if (!serialize.validate?.(o)) return;
    const lanes = (o as TrigSeqExt).lanes.map((row) => row.slice() as (0 | 1)[]);
    (m.ext as { trigseq?: TrigSeqExt }).trigseq = { lanes };
    pushTrig(m, { lanes });
  },
};
