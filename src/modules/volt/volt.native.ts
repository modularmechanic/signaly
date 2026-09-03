import { getAudioContext } from '../../engine/audio-context';
import type { NativeSpec } from '../../engine/types';

const fmt = (v: number): string => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`;

/** VOLTS — IN/THRU pass-through with an analyser tap. `m.ext.analyser` + `m.ext.buf`
    feed a live meter; `m.ext.text` carries the attenuverter readout. */
export const native: NativeSpec = {
  audio(m) {
    const ac = getAudioContext();
    const g = ac.createGain();
    const an = ac.createAnalyser();
    an.fftSize = 1024;
    g.connect(an);
    (m.natives ??= []).push(g, an);
    m.jacks.in.in = { node: g, idx: 0 };
    m.jacks.out.thru = { node: g, idx: 0 };
    m.ext.analyser = an;
    m.ext.buf = new Float32Array(an.fftSize);
    m.ext.text = fmt(m.vals.inA ?? 0);
  },

  param(m, id, v) {
    if (id === 'inA') m.ext.text = fmt(v);
  },
};
