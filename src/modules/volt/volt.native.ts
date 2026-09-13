import { getAudioContext } from '../../engine/audio-context';
import type { NativeSpec } from '../../engine/types';

const fmt = (v: number): string => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`;

/** VOLTS — IN/THRU pass-through. `m.ext.text` carries the attenuverter readout, which is
    the whole display: the `text` row of the display contract, nothing else. */
export const native: NativeSpec = {
  audio(m) {
    const ac = getAudioContext();
    const g = ac.createGain();
    (m.natives ??= []).push(g);
    m.jacks.in.in = { node: g, idx: 0 };
    m.jacks.out.thru = { node: g, idx: 0 };
    m.ext.text = fmt(m.vals.inA ?? 0);
  },

  param(m, id, v) {
    if (id === 'inA') m.ext.text = fmt(v);
  },
};
