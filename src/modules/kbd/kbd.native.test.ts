import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ModuleInstance } from '../../engine/types';
import { def } from './kbd.def';
import { native } from './kbd.native';

interface FakeSrc {
  offset: { value: number; setValueAtTime: (v: number) => void; setTargetAtTime: (v: number) => void };
}
const created: FakeSrc[] = [];

vi.mock('../../engine/audio-context', () => ({
  getAudioContext: () => ({
    currentTime: 0,
    createConstantSource: () => {
      const node: FakeSrc = {
        offset: {
          value: 0,
          setValueAtTime: (v: number) => {
            node.offset.value = v;
          },
          setTargetAtTime: (v: number) => {
            node.offset.value = v;
          },
        },
        start: () => undefined,
      } as unknown as FakeSrc;
      created.push(node);
      return node;
    },
  }),
}));

interface Kbd {
  held: number[];
}

let m: ModuleInstance;
const gate = (): number => created[1]?.offset.value ?? -1;
const held = (): number[] => (m.ext.kbd as Kbd).held;

const down = (init: KeyboardEventInit): void => {
  window.dispatchEvent(new KeyboardEvent('keydown', init));
};
const up = (init: KeyboardEventInit): void => {
  window.dispatchEvent(new KeyboardEvent('keyup', init));
};

beforeEach(() => {
  created.length = 0;
  m = { uid: 1, def, jacks: { in: {}, out: {} }, vals: {}, sws: {}, ext: {} } as unknown as ModuleInstance;
  native.audio?.(m);
});

afterEach(() => {
  (m.ext.kbd as { detach: () => void }).detach();
  document.body.innerHTML = '';
});

describe('kbd.native', () => {
  it('holds the gate while a mapped key is down', () => {
    down({ key: 'a', code: 'KeyA' });
    expect(held()).toEqual([60]);
    expect(gate()).toBe(5);
    up({ key: 'a', code: 'KeyA' });
    expect(held()).toEqual([]);
    expect(gate()).toBe(0);
  });

  it('releases a key whose keyup lands in a text field', () => {
    down({ key: 'a', code: 'KeyA' });
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    up({ key: 'a', code: 'KeyA' });
    expect(held()).toEqual([]);
    expect(gate()).toBe(0);
  });

  it('releases a key whose keyup carries a modifier', () => {
    down({ key: 'a', code: 'KeyA' });
    up({ key: 'a', code: 'KeyA', ctrlKey: true });
    expect(held()).toEqual([]);
    expect(gate()).toBe(0);
  });

  it('window blur releases everything still down', () => {
    down({ key: 'a', code: 'KeyA' });
    down({ key: 'd', code: 'KeyD' });
    expect(held()).toEqual([60, 64]);
    window.dispatchEvent(new Event('blur'));
    expect(held()).toEqual([]);
    expect(gate()).toBe(0);
  });

  it('detach drops the blur handler too', () => {
    down({ key: 'a', code: 'KeyA' });
    (m.ext.kbd as { detach: () => void }).detach();
    window.dispatchEvent(new Event('blur'));
    expect(held()).toEqual([60]);
  });
});
