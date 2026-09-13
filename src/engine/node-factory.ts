import type { ModuleDef } from '../core/types';
import { getAudioContext } from './audio-context';
import type { ModuleInstance, NativeSpec } from './types';

/** THE param source: every knob and switch id -> its value, the def's initial unless `live`
    (a placed instance) has moved it. A DSP's `this.p` is this bag and nothing else — both the
    live node and verifyDsp's offline render are seeded from here — so a `defaults()` that only
    restates def initials is dead weight. */
export function seedParams(
  d: Pick<ModuleDef, 'knobs' | 'sws'>,
  live?: Pick<ModuleInstance, 'vals' | 'sws'>,
): Record<string, number> {
  const p: Record<string, number> = {};
  for (const k of d.knobs) p[k.id] = live?.vals[k.id] ?? k.initial;
  for (const s of d.sws ?? []) p[s.id] = live?.sws[s.id] ?? s.initial ?? 0;
  return p;
}

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
    const node = createWorkletModuleNode(ac, d.worklet, d.ins.length, d.outs.length, seedParams(d, m));
    m.node = node;
    d.ins.forEach((j, i) => (m.jacks.in[j.id] = { node, idx: i }));
    d.outs.forEach((j, i) => (m.jacks.out[j.id] = { node, idx: i }));
  } else if (native) {
    native.audio(m);
    assertJacksFilled(m);
  }
  installCvAttenuverters(m);
}

/** A native fills `m.jacks` by hand, by string key, and every miss is otherwise silent:
    wireCable no-ops on an unfilled jack (cable drawn, no audio) and installCvAttenuverters
    skips an unfilled CV input (knob turns, nothing happens). Only a built-in can be native,
    so a miss is always a programming error — say so at construction, loudly. */
function assertJacksFilled(m: ModuleInstance): void {
  const missing = [
    ...m.def.ins.filter((j) => !m.jacks.in[j.id]).map((j) => `in.${j.id}`),
    ...m.def.outs.filter((j) => !m.jacks.out[j.id]).map((j) => `out.${j.id}`),
  ];
  if (missing.length)
    throw new Error(`${m.def.id}: native.audio left ${missing.join(', ')} unfilled in m.jacks`);
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
