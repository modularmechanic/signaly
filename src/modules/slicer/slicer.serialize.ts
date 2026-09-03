import type { ModuleInstance, SerializeSpec } from '../../engine/types';

export interface SlicerExt {
  id?: string;
  name?: string;
}

/** The picked sample's id + display name, on `m.ext.slicer`. The audio itself lives in
    IndexedDB (see src/storage/sample-store.ts) and is re-decoded by the picker on load. */
export function getSlicerExt(m: ModuleInstance): SlicerExt {
  const ext = m.ext as { slicer?: SlicerExt };
  ext.slicer ??= {};
  return ext.slicer;
}

export const serialize: SerializeSpec = {
  save: (m) => ({ ...getSlicerExt(m) }),

  // Runs on untrusted imported patch JSON: bounded, total, never throws.
  validate: (o) => {
    if (typeof o !== 'object' || o === null) return false;
    const { id, name } = o as { id?: unknown; name?: unknown };
    return (id === undefined || typeof id === 'string') && (name === undefined || typeof name === 'string');
  },

  load: (m, o) => {
    if (!serialize.validate(o)) return;
    (m.ext as { slicer?: SlicerExt }).slicer = { ...(o as SlicerExt) };
  },
};
