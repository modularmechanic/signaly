import { getAudioContext } from '../../engine/audio-context';
import type { ModuleInstance, NativeSpec } from '../../engine/types';

function gains(m: ModuleInstance): Record<string, GainNode> {
  m.ext.gains ??= {};
  return m.ext.gains as Record<string, GainNode>;
}

/** Four level-controlled inputs summed into one output. */
export const native: NativeSpec = {
  audio(m) {
    const ac = getAudioContext();
    const nodes = (m.natives ??= []);
    const sum = ac.createGain();
    nodes.push(sum);
    const g = gains(m);
    m.def.ins.forEach((jack, i) => {
      const key = `l${i + 1}`;
      const node = ac.createGain();
      node.gain.value = m.vals[key] ?? 0.8;
      node.connect(sum);
      nodes.push(node);
      g[key] = node;
      m.jacks.in[jack.id] = { node, idx: 0 };
    });
    m.jacks.out.out = { node: sum, idx: 0 };
  },

  param(m, id, v) {
    gains(m)[id]?.gain.setTargetAtTime(v, getAudioContext().currentTime, 0.01);
  },
};
