import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { JackDef } from '../core/types';
import { connectCable, disconnectCable } from '../engine/rack';
import { useRackStore } from '../state/rack-store';
import {
  armJack,
  beginDrag,
  cancelArm,
  disconnectAt,
  getDrag,
  subscribe,
  unpatchJack,
  type Outcome,
} from './jack-interaction';
import { jackKey, registerJack, unregisterJack, type JackDir, type JackInfo } from './jack-registry';

vi.mock('../engine/rack', () => ({
  connectCable: vi.fn(() => ({ id: 42 })),
  disconnectCable: vi.fn(),
}));

const OUT: JackDef = { id: 'o', label: 'OUT', kind: 'a' };
const IN: JackDef = { id: 'i', label: 'IN', kind: 'a' };
const CABLE = { id: 7, from: { uid: 1, jack: 'o' }, to: { uid: 2, jack: 'i' } };

const mkJack = (uid: number, dir: JackDir, def: JackDef): JackInfo => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  el.dataset.jackKey = jackKey(uid, dir, def.id);
  const info: JackInfo = { uid, dir, def, el };
  registerJack(info);
  return info;
};

const ptr = (type: string): PointerEvent =>
  new MouseEvent(type, { clientX: 10, clientY: 10 }) as unknown as PointerEvent;

let out: JackInfo;
let inp: JackInfo;
let seen: Outcome[];
let off: () => void;

beforeEach(() => {
  vi.mocked(connectCable).mockClear();
  vi.mocked(disconnectCable).mockClear();
  useRackStore.getState().reset();
  cancelArm();
  out = mkJack(1, 'out', OUT);
  inp = mkJack(2, 'in', IN);
  document.elementsFromPoint = () => [inp.el];
  seen = [];
  off = subscribe((o) => seen.push(o));
});

afterEach(() => {
  off();
  cancelArm();
  unregisterJack(1, 'out', 'o');
  unregisterJack(2, 'in', 'i');
  out.el.remove();
  inp.el.remove();
});

describe('keyboard patching', () => {
  it('arm then arm the partner reports a connection carrying both jack labels', () => {
    expect(armJack(out)).toEqual({ type: 'armed', jack: out });
    expect(inp.el.classList.contains('compat')).toBe(true);

    const done = armJack(inp);
    expect(connectCable).toHaveBeenCalledWith({ uid: 1, jack: 'o' }, { uid: 2, jack: 'i' });
    expect(done.type).toBe('connected');
    // the outcome names jacks the way a person reads them, not by id
    if (done.type === 'connected') {
      expect(done.from.def.label).toBe('OUT');
      expect(done.to.def.label).toBe('IN');
      expect(done.from.def.kind).toBe('a');
    }
    expect(seen.map((o) => o.type)).toEqual(['armed', 'connected']);
    expect(inp.el.classList.contains('compat')).toBe(false);
  });

  it('cancel reports the cancelled jack and leaves the pair unpatched', () => {
    armJack(out);
    expect(cancelArm()).toEqual({ type: 'cancelled', jack: out });
    expect(inp.el.classList.contains('compat')).toBe(false);
    expect(armJack(inp).type).toBe('armed');
    expect(connectCable).not.toHaveBeenCalled();
  });

  it('re-arming the same jack cancels', () => {
    armJack(out);
    expect(armJack(out).type).toBe('cancelled');
  });

  it('cancelling with nothing armed says nothing', () => {
    expect(cancelArm()).toEqual({ type: 'none' });
    expect(seen).toEqual([]);
  });

  it('a failed connect reports nothing patched', () => {
    vi.mocked(connectCable).mockReturnValueOnce(null);
    armJack(out);
    expect(armJack(inp)).toEqual({ type: 'none' });
  });
});

describe('unpatchJack', () => {
  it('pulls every cable on the jack and reports the count, from either end', () => {
    useRackStore.getState().addCable(CABLE);
    expect(unpatchJack(inp)).toEqual({ type: 'disconnected', count: 1 });
    expect(disconnectCable).toHaveBeenCalledWith(7);
    expect(unpatchJack(out)).toEqual({ type: 'disconnected', count: 1 });
  });

  it('stays silent when there was nothing to pull', () => {
    expect(unpatchJack(inp)).toEqual({ type: 'none' });
    expect(disconnectCable).not.toHaveBeenCalled();
    expect(seen).toEqual([]);
  });
});

describe('disconnectAt', () => {
  it('removes a cable by id and reports it', () => {
    useRackStore.getState().addCable(CABLE);
    expect(disconnectAt(7)).toEqual({ type: 'disconnected', count: 1 });
    expect(disconnectCable).toHaveBeenCalledWith(7);
  });

  it('says nothing for a cable that is already gone', () => {
    expect(disconnectAt(7)).toEqual({ type: 'none' });
    expect(seen).toEqual([]);
  });
});

describe('beginDrag', () => {
  it('marks the source hot and every compatible jack, then patches on release', () => {
    beginDrag(out, ptr('pointerdown'));
    expect(getDrag()?.fixed.uid).toBe(1);
    expect(out.el.classList.contains('hot')).toBe(true);
    expect(inp.el.classList.contains('compat')).toBe(true);
    window.dispatchEvent(ptr('pointerup'));
    expect(connectCable).toHaveBeenCalledWith({ uid: 1, jack: 'o' }, { uid: 2, jack: 'i' });
    expect(seen.map((o) => o.type)).toEqual(['connected']);
  });

  it('pointercancel ends the drag, clears the classes and patches nothing', () => {
    beginDrag(out, ptr('pointerdown'));
    window.dispatchEvent(ptr('pointercancel'));
    expect(getDrag()).toBeNull();
    expect(out.el.classList.contains('hot')).toBe(false);
    expect(inp.el.classList.contains('compat')).toBe(false);
    expect(connectCable).not.toHaveBeenCalled();
  });

  it('pointercancel unbinds the window listeners', () => {
    beginDrag(out, ptr('pointerdown'));
    window.dispatchEvent(ptr('pointercancel'));
    window.dispatchEvent(ptr('pointermove'));
    window.dispatchEvent(ptr('pointerup'));
    expect(getDrag()).toBeNull();
    expect(connectCable).not.toHaveBeenCalled();
  });

  it('dragging a patched input off and dropping it on nothing reports the removal', () => {
    useRackStore.getState().addCable(CABLE);
    document.elementsFromPoint = () => [];
    beginDrag(inp, ptr('pointerdown'));
    expect(disconnectCable).toHaveBeenCalledWith(7);
    // the pull itself is silent: mid-drag the cable is being moved, not removed
    expect(seen).toEqual([]);
    window.dispatchEvent(ptr('pointerup'));
    expect(seen).toEqual([{ type: 'disconnected', count: 1 }]);
  });
});
