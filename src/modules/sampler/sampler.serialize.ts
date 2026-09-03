import type { ModuleInstance, SerializeSpec } from '../../engine/types';

export interface SamplerExt {
  id?: string;
  name?: string;
}

/** The picked sample's id + display name, on `m.ext.sampler`. The audio itself lives in
    IndexedDB (see src/storage/sample-store.ts) and is re-decoded by the picker on load. */
export function getSamplerExt(m: ModuleInstance): SamplerExt {
  const ext = m.ext as { sampler?: SamplerExt };
  ext.sampler ??= {};
  return ext.sampler;
}

export const serialize: SerializeSpec = {
  save: (m) => ({ ...getSamplerExt(m) }),

  // Runs on untrusted imported patch JSON: bounded, total, never throws.
  validate: (o) => {
    if (typeof o !== 'object' || o === null) return false;
    const { id, name } = o as { id?: unknown; name?: unknown };
    return (id === undefined || typeof id === 'string') && (name === undefined || typeof name === 'string');
  },

  load: (m, o) => {
    if (!serialize.validate(o)) return;
    (m.ext as { sampler?: SamplerExt }).sampler = { ...(o as SamplerExt) };
  },
};
