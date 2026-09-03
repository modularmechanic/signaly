import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ModuleInstance } from '../../engine/types';
import { def } from './mult.def';
import { native } from './mult.native';

const created: { connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] = [];

vi.mock('../../engine/audio-context', () => ({
  getAudioContext: () => ({
    createGain: () => {
      const node = { gain: { value: 0 }, connect: vi.fn(), disconnect: vi.fn() };
      created.push(node);
      return node;
    },
  }),
}));

const instance = (): ModuleInstance =>
  ({ uid: 1, def, jacks: { in: {}, out: {} }, vals: {}, sws: {}, ext: {} }) as unknown as ModuleInstance;

beforeEach(() => {
  created.length = 0;
});

describe('mult.native', () => {
  it('fans the single input out to every declared output jack', () => {
    const m = instance();
    native.audio(m);
    const src = m.jacks.in.in;
    expect(src).toBeDefined();
    for (const j of def.outs) expect(m.jacks.out[j.id]?.node).toBe(src?.node);
  });

  it('registers every created node for teardown', () => {
    const m = instance();
    native.audio(m);
    expect(created).toHaveLength(1);
    expect(m.natives).toHaveLength(created.length);
  });
});
