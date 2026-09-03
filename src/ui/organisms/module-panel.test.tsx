import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ModuleInstance } from '../../engine/types';
import { layoutPanel } from '../../modules/panel-layout';
import { def as svf } from '../../modules/svf/svf.def';
import { useRackStore } from '../../state/rack-store';
import { ModulePanel } from './module-panel';

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

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  useRackStore.getState().reset();
  m = { uid: 1, def: svf, jacks: { in: {}, out: {} }, vals: {}, sws: {}, ext: {} };
  svf.knobs.forEach((k) => (m.vals[k.id] = k.initial));
  useRackStore.getState().addModuleInstance(m, 0);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<ModulePanel m={m} />));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('ModulePanel', () => {
  it('renders one .panel-node per layout node', () => {
    expect(host.querySelectorAll('.panel-node')).toHaveLength(layoutPanel(svf).nodes.length);
  });

  it('renders every knob as an ARIA slider', () => {
    const sliders = [...host.querySelectorAll('[role="slider"]')];
    expect(sliders).toHaveLength(svf.knobs.length);
    expect(sliders.map((el) => el.getAttribute('aria-label'))).toEqual(svf.knobs.map((k) => k.label));
  });

  it('renders a jack per in/out node and tints the faceplate by category', () => {
    expect(host.querySelectorAll('.jack')).toHaveLength(svf.ins.length + svf.outs.length);
    const panel = host.querySelector<HTMLElement>('.module-panel');
    expect(panel?.style.getPropertyValue('--hp-count')).toBe(String(svf.hp));
    expect(panel?.style.getPropertyValue('--cat')).toBe('#ffc247');
  });
});
