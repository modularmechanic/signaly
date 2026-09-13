import { describe, expect, it, vi } from 'vitest';
import type { ModuleDef } from '../core/types';
import { makeNode, seedParams } from './node-factory';
import type { ModuleInstance, NativeSpec } from './types';

vi.mock('./audio-context', () => ({
  getAudioContext: () => ({
    createGain: () => ({ gain: { value: 0 }, connect: () => undefined, disconnect: () => undefined }),
  }),
}));

const knob = (id: string): ModuleDef['knobs'][number] => ({
  id,
  label: id,
  min: -1,
  max: 1,
  initial: 0,
  fmt: 'f1',
  attenuates: 'cv',
});

const DEF: ModuleDef = {
  id: 'tatt',
  name: 'ATT',
  sub: 'fixture',
  hp: 4,
  cat: 'UTILITY',
  knobs: [knob('a'), knob('b')],
  ins: [{ id: 'cv', label: 'CV', kind: 'c' }],
  outs: [],
};

describe('seedParams', () => {
  it('takes the def initials, and a switch initial rather than 0', () => {
    const def = {
      knobs: [{ id: 'freq', label: 'F', min: 0, max: 1, initial: 0.25, fmt: 'f1' as const }],
      sws: [{ id: 'wave', label: 'W', options: ['A', 'B', 'C'], initial: 2 }],
    };
    expect(seedParams(def)).toEqual({ freq: 0.25, wave: 2 });
  });

  it('prefers a placed instance live values', () => {
    const def = {
      knobs: [{ id: 'freq', label: 'F', min: 0, max: 1, initial: 0.25, fmt: 'f1' as const }],
      sws: [{ id: 'wave', label: 'W', options: ['A', 'B'], initial: 1 }],
    };
    expect(seedParams(def, { vals: { freq: 0.9 }, sws: { wave: 0 } })).toEqual({ freq: 0.9, wave: 0 });
  });
});

describe('native jack coverage', () => {
  it('throws when native.audio leaves a declared jack unfilled', () => {
    const m: ModuleInstance = {
      uid: 2,
      def: { ...DEF, knobs: [], outs: [{ id: 'out', label: 'OUT', kind: 'a' }] },
      jacks: { in: {}, out: {} },
      vals: {},
      sws: {},
      ext: {},
    };
    const native: NativeSpec = {
      audio: (mm) => {
        mm.jacks.in.cv = { node: {} as AudioNode, idx: 0 };
      },
    };
    expect(() => makeNode(m, native)).toThrow(/out\.out/);
  });
});

describe('installCvAttenuverters', () => {
  it('installs one gain per CV input even if two knobs claim the same jack', () => {
    const real = { node: {} as AudioNode, idx: 0 };
    const m: ModuleInstance = {
      uid: 1,
      def: DEF,
      jacks: { in: {}, out: {} },
      vals: { a: 0.5, b: 0.25 },
      sws: {},
      ext: {},
    };
    const native: NativeSpec = {
      audio: (mm) => {
        mm.jacks.in.cv = real;
      },
    };
    makeNode(m, native);

    expect(Object.keys(m.cvGains ?? {})).toEqual(['cv']);
    // the first knob wins, and its gain still points at the module's real input
    expect(m.cvGains?.cv?.target).toBe(real);
    expect(m.cvGains?.cv?.node.gain.value).toBe(0.5);
    expect(m.natives).toHaveLength(1);
  });
});
