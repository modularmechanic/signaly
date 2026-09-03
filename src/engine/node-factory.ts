import { getAudioContext } from './audio-context';
import type { ModuleInstance, NativeSpec } from './types';

/** One AudioWorkletNode with one mono output per declared out jack. */
export function createWorkletModuleNode(
  context: BaseAudioContext,
  processorName: string,
  inputCount: number,
  outputCount: number,
  parameters: Readonly<Record<string, number>>,
): AudioWorkletNode {
  const outs = Math.max(1, outputCount);
  return new AudioWorkletNode(context, processorName, {
    numberOfInputs: Math.max(0, inputCount),
    numberOfOutputs: outs,
    outputChannelCount: Array.from({ length: outs }, () => 1),
    processorOptions: { p: { ...parameters } },
  });
}

/** Build audio for a module instance IN PLACE. `m.vals` / `m.sws` must already be seeded. */
export function makeNode(m: ModuleInstance, native?: NativeSpec): void {
  const d = m.def;
  if (d.worklet) {
    const ac = getAudioContext();
    const p: Record<string, number> = {};
    d.knobs.forEach((k) => (p[k.id] = m.vals[k.id] ?? k.initial));
    (d.sws ?? []).forEach((s) => (p[s.id] = m.sws[s.id] ?? 0));
    const node = createWorkletModuleNode(ac, d.worklet, d.ins.length, d.outs.length, p);
    m.node = node;
    d.ins.forEach((j, i) => (m.jacks.in[j.id] = { node, idx: i }));
    d.outs.forEach((j, i) => (m.jacks.out[j.id] = { node, idx: i }));
  } else if (native) {
    native.audio(m);
  }
  installCvAttenuverters(m);
}

/** A bipolar amount knob is voltage scaling at the CV input, not a DSP param, so the
    gain sits between the patch jack and the module input for worklet AND native modules.
    rack.connectCable wires gain -> target only while patched, preserving unpatched defaults. */
function installCvAttenuverters(m: ModuleInstance): void {
  const ac = getAudioContext();
  for (const knob of m.def.knobs) {
    const jackId = knob.attenuates;
    if (!jackId) continue;
    // A second gain on the same jack would swallow the first: wireCable only ever
    // connects one cvGains pair, so the earlier gain would never reach the real input.
    if (m.cvGains?.[jackId]) continue;
    const target = m.jacks.in[jackId];
    if (!target) continue;
    const gain = ac.createGain();
    gain.gain.value = m.vals[knob.id] ?? 0;
    (m.cvGains ??= {})[jackId] = { node: gain, target };
    m.jacks.in[jackId] = { node: gain, idx: 0 };
    (m.natives ??= []).push(gain);
  }
}

/** Push a live param change to the running node. */
export function pushParam(m: ModuleInstance, native: NativeSpec | undefined, id: string, v: number): void {
  if (m.def.worklet && m.node) m.node.port.postMessage({ t: 'p', id, v });
  else if (native?.param) native.param(m, id, v);
}
