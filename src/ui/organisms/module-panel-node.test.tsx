import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ModuleInstance } from '../../engine/types';
import { def as svf } from '../../modules/svf/svf.def';
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
