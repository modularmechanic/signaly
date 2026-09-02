import type { ModuleInstance, SerializeSpec } from '../../engine/types';

export interface SeqStep {
  pitch: number;
  gate: 0 | 1;
}
export interface SeqExt {
  steps: SeqStep[];
}

export const STEPS = 8;
const DEF_PITCH = [0, 3, 7, 10, 12, 7, 3, -2];
const DEF_GATE: (0 | 1)[] = [1, 1, 1, 1, 1, 0, 1, 1];

const seed = (): SeqExt => ({
  steps: DEF_PITCH.map((pitch, i) => ({ pitch, gate: DEF_GATE[i] ?? 1 })),
});

/** The live pattern on `m.ext.seq`, seeded on first read. */
export function getSeq(m: ModuleInstance): SeqExt {
  const ext = m.ext as { seq?: SeqExt };
  ext.seq ??= seed();
  return ext.seq;
}

/** Mirror the whole pattern into the running processor. */
export function pushSeq(m: ModuleInstance, s: SeqExt): void {
  m.node?.port.postMessage({
    t: 'steps',
    v: s.steps.map((x) => x.pitch),
    g: s.steps.map((x) => x.gate),
  });
}

export const serialize: SerializeSpec = {
  save: (m) => ({ steps: getSeq(m).steps.map((s) => ({ pitch: s.pitch, gate: s.gate })) }),

  // Runs on untrusted imported patch JSON: bounded, total, never throws.
  validate: (o) => {
    if (typeof o !== 'object' || o === null) return false;
    const steps = (o as { steps?: unknown }).steps;
    if (!Array.isArray(steps) || steps.length !== STEPS) return false;
    return steps.every((s) => {
      if (typeof s !== 'object' || s === null) return false;
      const { pitch, gate } = s as { pitch?: unknown; gate?: unknown };
      return typeof pitch === 'number' && Number.isFinite(pitch) && (gate === 0 || gate === 1);
    });
  },

  load: (m, o) => {
    if (!serialize.validate?.(o)) return;
    const steps = (o as SeqExt).steps.map((s) => ({ pitch: s.pitch, gate: s.gate }));
    (m.ext as { seq?: SeqExt }).seq = { steps };
    pushSeq(m, { steps });
  },
};
