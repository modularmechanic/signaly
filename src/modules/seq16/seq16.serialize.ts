import type { ModuleInstance, SerializeSpec } from '../../engine/types';

export interface Seq16Step {
  pitch: number;
  gate: 0 | 1;
  slide: 0 | 1;
}
export interface Seq16Ext {
  steps: Seq16Step[];
}

export const STEPS = 16;
const DEF_PITCH = [0, 3, 7, 10, 12, 7, 3, -2, 0, 3, 7, 10, 12, 7, 3, -2];
const DEF_GATE: (0 | 1)[] = [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1];

const seed = (): Seq16Ext => ({
  steps: DEF_PITCH.map((pitch, i) => ({ pitch, gate: DEF_GATE[i] ?? 1, slide: 0 })),
});

/** The live pattern on `m.ext.seq16`, seeded on first read. */
export function getSeq16(m: ModuleInstance): Seq16Ext {
  const ext = m.ext as { seq16?: Seq16Ext };
  ext.seq16 ??= seed();
  return ext.seq16;
}

/** Mirror the whole pattern into the running processor. */
export function pushSeq16(m: ModuleInstance, s: Seq16Ext): void {
  m.node?.port.postMessage({
    t: 'steps',
    v: s.steps.map((x) => x.pitch),
    g: s.steps.map((x) => x.gate),
    sl: s.steps.map((x) => x.slide),
  });
}

export const serialize: SerializeSpec = {
  save: (m) => ({
    steps: getSeq16(m).steps.map((s) => ({ pitch: s.pitch, gate: s.gate, slide: s.slide })),
  }),

  // Runs on untrusted imported patch JSON: bounded, total, never throws.
  validate: (o) => {
    if (typeof o !== 'object' || o === null) return false;
    const steps = (o as { steps?: unknown }).steps;
    if (!Array.isArray(steps) || steps.length !== STEPS) return false;
    return steps.every((s) => {
      if (typeof s !== 'object' || s === null) return false;
      const { pitch, gate, slide } = s as { pitch?: unknown; gate?: unknown; slide?: unknown };
      return (
        typeof pitch === 'number' &&
        Number.isFinite(pitch) &&
        (gate === 0 || gate === 1) &&
        (slide === 0 || slide === 1)
      );
    });
  },

  load: (m, o) => {
    if (!serialize.validate?.(o)) return;
    const steps = (o as Seq16Ext).steps.map((s) => ({ pitch: s.pitch, gate: s.gate, slide: s.slide }));
    (m.ext as { seq16?: Seq16Ext }).seq16 = { steps };
    pushSeq16(m, { steps });
  },
};
