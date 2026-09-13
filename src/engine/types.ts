import type { ComponentType } from 'react';
import type { ModuleDef } from '../core/types';

/** A resolved audio endpoint: which node + which input/output port index. */
export interface JackRef {
  node: AudioNode;
  idx: number;
}

/** Live runtime instance of a module placed in the rack. Identity-stable; React never clones it. */
export interface ModuleInstance {
  uid: number;
  def: ModuleDef;
  /** worklet node (carries `.port`); undefined for native modules */
  node?: AudioWorkletNode;
  jacks: { in: Record<string, JackRef>; out: Record<string, JackRef> };
  vals: Record<string, number>;
  sws: Record<string, number>;
  /** native helper nodes to disconnect on teardown */
  natives?: AudioNode[];
  /** per-CV-input attenuverter gains (KnobDef.attenuates), keyed by input jack id */
  cvGains?: Record<string, { node: GainNode; target: JackRef }>;
  /** escape hatch for module-specific runtime state (analysers, ring buffers, …) */
  ext: Record<string, unknown>;
}

export interface NativeSpec {
  /** Build the graph and fill `m.jacks.in`/`m.jacks.out` for EVERY declared jack, by id, plus
      push each node onto `m.natives`. makeNode throws on a jack this leaves unfilled. */
  audio(m: ModuleInstance): void;
  /** Live control change. Receives switch pushes too, by switch id, as the option index. */
  param?(m: ModuleInstance, id: string, v: number): void;
  onConnectionChange?(m: ModuleInstance, dir: 'in' | 'out', jack: string, connected: boolean): void;
  dispose?(m: ModuleInstance): void;
}

export interface SerializeSpec {
  save(m: ModuleInstance): unknown;
  load(m: ModuleInstance, o: unknown): void;
  /** boundary check for untrusted `ext` before `load`; must never throw */
  validate(o: unknown): boolean;
}

export interface ModuleSpec {
  def: ModuleDef;
  native?: NativeSpec;
  serialize?: SerializeSpec;
  parts?: ComponentType<{ m: ModuleInstance }>;
  /** image-store id of a faceplate image painted over the panel. User modules pass theirs at
      registerSpec; a built-in may carry one the same way, so an image is a data question and
      not a property of the def id. */
  faceplate?: string;
}

export interface Cable {
  id: number;
  from: { uid: number; jack: string };
  to: { uid: number; jack: string };
}

export interface RackRow {
  id: string;
  uids: number[];
}
