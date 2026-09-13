import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ModuleInstance } from '../../engine/types';
import { def as svf } from '../../modules/svf/svf.def';
import { def as seq } from '../../modules/seq/seq.def';
import { def as voct } from '../../modules/voct/voct.def';
import { setParam } from '../../engine/rack';
import { useRackStore } from '../../state/rack-store';
import { PanelNodeView } from './module-panel-node';

vi.mock('../../engine/audio-context', () => ({
  getAudioContext: () => ({ createGain: () => ({ gain: { value: 0 }, connect: () => undefined }) }),
  loadWorklet: () => Promise.resolve(),
  isWorkletReady: () => true,
  isRunning: () => true,
  resume: () => undefined,
}));

let host: HTMLDivElement;
let root: Root;
let m: ModuleInstance;

// svf: knob `cut` has cvIn 'cv'; knob `cv` (-1..1) attenuates that same jack.
const cutNode = { id: 'knob:cut', kind: 'knob' as const, x: 0, y: 0, w: 1, h: 1 };

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  useRackStore.getState().reset();
  m = { uid: 1, def: svf, jacks: { in: {}, out: {} }, vals: {}, sws: {}, ext: {} };
  svf.knobs.forEach((k) => (m.vals[k.id] = k.initial));
  useRackStore.getState().addModuleInstance(m, 0);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<PanelNodeView node={cutNode} m={m} connected={new Set()} />));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const displayNode = { id: 'display:text', kind: 'display' as const, x: 0, y: 0, w: 1, h: 1 };

/** VOCT is a native with `display: 'text'`: its feed is `m.ext.text`, assigned in audio(). */
const voctInstance = (ext: Record<string, unknown>): ModuleInstance => ({
  uid: 2,
  def: voct,
  jacks: { in: {}, out: {} },
  vals: {},
  sws: {},
  ext,
});

describe('PanelNodeView display placeholder', () => {
  let host2: HTMLDivElement;
  let root2: Root;

  const render = (inst: ModuleInstance): void => {
    host2 = document.createElement('div');
    document.body.appendChild(host2);
    root2 = createRoot(host2);
    act(() => root2.render(<PanelNodeView node={displayNode} m={inst} connected={new Set()} />));
  };

  afterEach(() => {
    act(() => root2.unmount());
    host2.remove();
  });

  it('says so out loud when the declared display has no feed behind it', () => {
    render(voctInstance({}));
    const screen = host2.querySelector<HTMLElement>('.screen-missing');
    expect(screen?.textContent).toBe('NO TEXT');
    expect(screen?.title).toMatch(/m\.ext\.text was never assigned/);
  });

  it('says so out loud when a reserved screen has no parts component to fill it', () => {
    // seq declares `screen: true`; PanelNodeView here is handed no `parts`.
    render({ ...voctInstance({}), def: seq });
    expect(host2.querySelector('.screen-missing')?.textContent).toBe('NO SCREEN');
  });

  it('draws the real display once the feed is there', () => {
    render(voctInstance({ text: '+3 ST' }));
    expect(host2.querySelector('.screen-missing')).toBeNull();
    expect(host2.querySelector('.text-screen')?.textContent).toBe('+3 ST');
  });
});

describe('PanelNodeView knob cvIn marker', () => {
  it('draws no marker while the attenuverter sits at zero', () => {
    expect(host.querySelector('.knob-cv')).toBeNull();
  });

  it('draws the marker at the attenuverter depth once it is turned up', () => {
    act(() => setParam(m.uid, 'cv', 0.25));
    const knob = host.querySelector<HTMLElement>('.knob');
    expect(host.querySelector('.knob-cv')).not.toBeNull();
    // 0.25 of the attenuverter's -1..1 span is 0.25 of the cut knob's travel.
    const pct = Number(knob?.style.getPropertyValue('--pct'));
    expect(Number(knob?.style.getPropertyValue('--cv'))).toBeCloseTo(pct + 0.25, 5);
  });

  it('drops the marker again when the attenuverter returns to zero', () => {
    act(() => setParam(m.uid, 'cv', 0.25));
    act(() => setParam(m.uid, 'cv', 0));
    expect(host.querySelector('.knob-cv')).toBeNull();
  });
});
