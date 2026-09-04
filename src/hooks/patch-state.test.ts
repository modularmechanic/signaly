import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectCable } from '../engine/rack';
import {
  CLICK_SLOP,
  clickRemovesCable,
  getDrag,
  jackKey,
  registerJack,
  startJackDrag,
  type JackInfo,
  unregisterJack,
} from './patch-state';

vi.mock('../engine/rack', () => ({
  connectCable: vi.fn(),
  disconnectCable: vi.fn(),
}));

const mkJack = (uid: number, dir: 'in' | 'out'): JackInfo => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  el.dataset.jackKey = jackKey(uid, dir, dir);
  const info: JackInfo = { uid, jackId: dir, dir, kind: 'a', el };
  registerJack(info);
  return info;
};

const ptr = (type: string): PointerEvent =>
  new MouseEvent(type, { clientX: 10, clientY: 10 }) as unknown as PointerEvent;

let out: JackInfo;
let inp: JackInfo;

beforeEach(() => {
  vi.mocked(connectCable).mockClear();
  out = mkJack(1, 'out');
  inp = mkJack(2, 'in');
  document.elementsFromPoint = () => [inp.el];
});

afterEach(() => {
  unregisterJack(1, 'out', 'out');
  unregisterJack(2, 'in', 'in');
  out.el.remove();
  inp.el.remove();
});

describe('startJackDrag', () => {
  it('marks the source hot and every compatible jack', () => {
    startJackDrag(out, ptr('pointerdown'));
    expect(getDrag()?.fixed.uid).toBe(1);
    expect(out.el.classList.contains('hot')).toBe(true);
    expect(inp.el.classList.contains('compat')).toBe(true);
    window.dispatchEvent(ptr('pointerup'));
    expect(connectCable).toHaveBeenCalledWith({ uid: 1, jack: 'out' }, { uid: 2, jack: 'in' });
  });

  it('pointercancel ends the drag, clears the classes and patches nothing', () => {
    startJackDrag(out, ptr('pointerdown'));
    window.dispatchEvent(ptr('pointercancel'));
    expect(getDrag()).toBeNull();
    expect(out.el.classList.contains('hot')).toBe(false);
    expect(inp.el.classList.contains('compat')).toBe(false);
    expect(connectCable).not.toHaveBeenCalled();
  });

  it('pointercancel unbinds the window listeners', () => {
    startJackDrag(out, ptr('pointerdown'));
    window.dispatchEvent(ptr('pointercancel'));
    window.dispatchEvent(ptr('pointermove'));
    window.dispatchEvent(ptr('pointerup'));
    expect(getDrag()).toBeNull();
    expect(connectCable).not.toHaveBeenCalled();
  });
});

describe('clickRemovesCable', () => {
  it('removes the cable under a real click', () => {
    expect(clickRemovesCable({ onControl: false, travel: 0 })).toBe(true);
    // A hand is never perfectly still; the slop is what keeps a click a click.
    expect(clickRemovesCable({ onControl: false, travel: CLICK_SLOP })).toBe(true);
  });

  it('keeps the cable when the press began on a control', () => {
    // The reported bug: turn a knob, let go over a cable, and the cable vanished. The knob has
    // pointer capture, so the click is retargeted to it and bubbles to the window listener with
    // whatever cable the cursor drifted over still hovered.
    expect(clickRemovesCable({ onControl: true, travel: 0 })).toBe(false);
    expect(clickRemovesCable({ onControl: true, travel: 300 })).toBe(false);
  });

  it('keeps the cable when the press travelled, wherever it began', () => {
    expect(clickRemovesCable({ onControl: false, travel: CLICK_SLOP + 1 })).toBe(false);
    expect(clickRemovesCable({ onControl: false, travel: 200 })).toBe(false);
  });
});
