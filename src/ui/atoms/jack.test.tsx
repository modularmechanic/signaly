import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { JackDef, ModuleDef } from '../../core/types';
import type { ModuleInstance } from '../../engine/types';
import { connectCable, disconnectCable } from '../../engine/rack';
import { cancelArm } from '../../hooks/patch-state';
import { useRackStore } from '../../state/rack-store';
import { Jack } from './jack';

vi.mock('../../engine/rack', () => ({
  connectCable: vi.fn(),
  disconnectCable: vi.fn(),
}));

const OUT: JackDef = { id: 'out', label: 'OUT', kind: 'a' };
const IN: JackDef = { id: 'in', label: 'IN', kind: 'a' };

const mkDef = (id: string, ins: JackDef[], outs: JackDef[]): ModuleDef => ({
  id,
  name: id,
  sub: '',
  hp: 4,
  cat: 'UTILITY',
  native: 'test',
  knobs: [],
  ins,
  outs,
});

const mkInstance = (uid: number, def: ModuleDef): ModuleInstance => ({
  uid,
  def,
  jacks: { in: {}, out: {} },
  vals: {},
  sws: {},
  ext: {},
});

let host: HTMLDivElement;
let root: Root;
let src: ModuleInstance;
let dst: ModuleInstance;

const btn = (label: string): HTMLElement => {
  const el = host.querySelector(`[aria-label^="${label}"]`);
  if (!el) throw new Error(`no jack ${label}`);
  return el as HTMLElement;
};

const press = (el: HTMLElement, k: string): void =>
  act(() => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  });

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.mocked(connectCable).mockClear();
  vi.mocked(disconnectCable).mockClear();
  cancelArm();
  useRackStore.getState().reset();
  src = mkInstance(1, mkDef('src', [], [OUT]));
  dst = mkInstance(2, mkDef('dst', [IN], []));
  useRackStore.getState().addModuleInstance(src, 0);
  useRackStore.getState().addModuleInstance(dst, 0);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() =>
    root.render(
      <>
        <Jack m={src} def={OUT} dir="out" patched={false} />
        <Jack m={dst} def={IN} dir="in" patched={false} />
      </>,
    ),
  );
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  cancelArm();
});

describe('Jack', () => {
  it('labels direction, kind and patch state', () => {
    expect(btn('OUT').getAttribute('aria-label')).toBe('OUT output, audio');
    act(() => root.render(<Jack m={src} def={OUT} dir="out" patched />));
    expect(btn('OUT').getAttribute('aria-label')).toBe(
      'OUT output, audio, patched — press Delete to disconnect',
    );
  });

  it('keyboard arm then complete reaches connectCable', () => {
    press(btn('OUT'), 'Enter');
    expect(btn('OUT').getAttribute('aria-pressed')).toBe('true');
    press(btn('IN'), 'Enter');
    expect(connectCable).toHaveBeenCalledWith({ uid: 1, jack: 'out' }, { uid: 2, jack: 'in' });
    expect(btn('OUT').getAttribute('aria-pressed')).toBe('false');
  });

  it('Escape cancels an armed jack', () => {
    press(btn('OUT'), 'Enter');
    expect(btn('OUT').getAttribute('aria-pressed')).toBe('true');
    press(btn('OUT'), 'Escape');
    expect(btn('OUT').getAttribute('aria-pressed')).toBe('false');
    press(btn('IN'), 'Enter');
    expect(connectCable).not.toHaveBeenCalled();
  });

  it('re-arming the same jack cancels', () => {
    press(btn('OUT'), 'Enter');
    press(btn('OUT'), ' ');
    expect(btn('OUT').getAttribute('aria-pressed')).toBe('false');
  });

  it('Delete on a patched jack disconnects it, from either end', () => {
    act(() => root.render(<Jack m={dst} def={IN} dir="in" patched />));
    const cable = { id: 7, from: { uid: 1, jack: 'out' }, to: { uid: 2, jack: 'in' } };
    act(() => useRackStore.getState().addCable(cable));
    press(btn('IN'), 'Delete');
    expect(vi.mocked(disconnectCable)).toHaveBeenCalledWith(7);

    vi.mocked(disconnectCable).mockClear();
    act(() => root.render(<Jack m={src} def={OUT} dir="out" patched />));
    press(btn('OUT'), 'Delete');
    expect(vi.mocked(disconnectCable)).toHaveBeenCalledWith(7);
  });

  it('Delete on an unpatched jack disconnects nothing and still reaches the panel', () => {
    // The panel listens with a React onKeyDown, so mirror that rather than a native listener.
    const onPanelKey = vi.fn();
    act(() =>
      root.render(
        <div onKeyDown={onPanelKey}>
          <Jack m={dst} def={IN} dir="in" patched={false} />
        </div>,
      ),
    );
    press(btn('IN'), 'Delete');
    expect(vi.mocked(disconnectCable)).not.toHaveBeenCalled();
    expect(onPanelKey).toHaveBeenCalled();
  });

  it('Delete on a patched jack stops propagation so the module is not removed', () => {
    const onPanelKey = vi.fn();
    act(() =>
      root.render(
        <div onKeyDown={onPanelKey}>
          <Jack m={dst} def={IN} dir="in" patched />
        </div>,
      ),
    );
    act(() =>
      useRackStore.getState().addCable({ id: 9, from: { uid: 1, jack: 'out' }, to: { uid: 2, jack: 'in' } }),
    );
    press(btn('IN'), 'Delete');
    expect(vi.mocked(disconnectCable)).toHaveBeenCalledWith(9);
    expect(onPanelKey).not.toHaveBeenCalled();
  });

  it('pointer drag ends in the same connect call', () => {
    const target = btn('IN');
    // jsdom has no layout, so hit-testing is stubbed
    document.elementsFromPoint = () => [target];
    act(() => {
      btn('OUT').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 5, clientY: 5 }));
      window.dispatchEvent(new MouseEvent('pointerup', { clientX: 40, clientY: 40 }));
    });
    expect(connectCable).toHaveBeenCalledWith({ uid: 1, jack: 'out' }, { uid: 2, jack: 'in' });
  });
});
