import { getAudioContext } from '../../engine/audio-context';
import type { NativeSpec } from '../../engine/types';

/** 1 → 4 splitter: one gain node fanned out to every output jack. */
export const native: NativeSpec = {
  audio(m) {
    const g = getAudioContext().createGain();
    (m.natives ??= []).push(g);
    m.jacks.in.in = { node: g, idx: 0 };
    for (const j of m.def.outs) m.jacks.out[j.id] = { node: g, idx: 0 };
  },
};
