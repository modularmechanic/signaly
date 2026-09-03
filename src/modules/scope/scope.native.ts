import { getAudioContext } from '../../engine/audio-context';
import type { NativeSpec } from '../../engine/types';

/** SCOPE — four IN/THRU pass-throughs, each with a passive analyser tap.
    `m.ext.analysers` / `m.ext.buffers` are the four channels in jack order;
    `m.ext.analyser` / `m.ext.buf` alias channel 1 for single-trace displays. */
export const native: NativeSpec = {
  audio(m) {
    const ac = getAudioContext();
    const analysers: AnalyserNode[] = [];
    const buffers: Float32Array<ArrayBuffer>[] = [];
    for (let i = 1; i <= 4; i++) {
      const g = ac.createGain();
      const an = ac.createAnalyser();
      an.fftSize = 2048;
      g.connect(an);
      (m.natives ??= []).push(g, an);
      m.jacks.in[`in${i}`] = { node: g, idx: 0 };
      m.jacks.out[`thru${i}`] = { node: g, idx: 0 };
      analysers.push(an);
      buffers.push(new Float32Array(an.fftSize));
    }
    m.ext.analysers = analysers;
    m.ext.buffers = buffers;
    m.ext.analyser = analysers[0];
    m.ext.buf = buffers[0];
  },
};
