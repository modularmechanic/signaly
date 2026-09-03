import { getAudioContext } from '../../engine/audio-context';
import type { ModuleInstance, NativeSpec } from '../../engine/types';

/** V/OCT — out = in + steps/12 V + cv. `m.ext.text` shows the applied transposition. */
function apply(m: ModuleInstance): void {
  const off = m.ext.off as ConstantSourceNode | undefined;
  if (!off) return;
  const lock = (m.sws.lock ?? 1) === 1;
  const semis = lock ? Math.round((m.vals.steps ?? 0) / 12) * 12 : Math.round(m.vals.steps ?? 0);
  off.offset.setTargetAtTime(semis / 12, getAudioContext().currentTime, lock ? 0.001 : 0.035);
  m.ext.text = `${semis >= 0 ? '+' : ''}${semis} ST`;
}

export const native: NativeSpec = {
  audio(m) {
    const ac = getAudioContext();
    const sum = ac.createGain();
    const inG = ac.createGain();
    const cvG = ac.createGain();
    const off = ac.createConstantSource();
    off.offset.value = 0;
    off.start();
    inG.connect(sum);
    cvG.connect(sum);
    off.connect(sum);
    (m.natives ??= []).push(sum, inG, cvG, off);
    m.jacks.in.in = { node: inG, idx: 0 };
    m.jacks.in.cv = { node: cvG, idx: 0 };
    m.jacks.out.out = { node: sum, idx: 0 };
    m.ext.off = off;
    apply(m);
  },

  param(m, id) {
    if (id === 'steps' || id === 'lock') apply(m);
  },

  dispose(m) {
    (m.ext.off as ConstantSourceNode | undefined)?.stop();
  },
};
