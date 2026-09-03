import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { KnobDef, ModuleDef } from '../core/types';
import type { ModuleInstance } from '../engine/types';
import { useRackStore } from '../state/rack-store';
import { Knob } from '../ui/atoms/knob';
import { runDraws } from './render-bus';

// A fake analyser that reports one constant voltage, plus the connect/disconnect bookkeeping
// the hook is supposed to do. `taps` records which node each analyser was hung off.
let volts = 0;
const taps: string[] = [];
let liveTaps = 0;

function fakeNode(name: string): AudioNode {
  const node = {
    name,
    context: {
      createAnalyser: (): AnalyserNode =>
        ({
          fftSize: 2048,
          getFloatTimeDomainData: (b: Float32Array) => b.fill(volts),
        }) as unknown as AnalyserNode,
    },
    connect: (): void => {
      taps.push(name);
      liveTaps++;
    },
    disconnect: (): void => {
      liveTaps--;
    },
  };
  return node as unknown as AudioNode;
}

const CUT: KnobDef = { id: 'cut', label: 'CUTOFF', min: 0, max: 100, initial: 50, cvIn: 'cv' };
const PLAIN: KnobDef = { id: 'cut', label: 'CUTOFF', min: 0, max: 100, initial: 50 };

const def: ModuleDef = {
  id: 'test-cv',
  name: 'TEST',
  sub: 'CV',
  hp: 8,
  cat: 'FILTERS',
  native: 'test',
  knobs: [CUT],
  ins: [{ id: 'cv', label: 'CV', kind: 'c' }],
  outs: [],
};

let host: HTMLDivElement;
let root: Root;
let m: ModuleInstance;
let lfo: ModuleInstance;

/** The knob element's live `--cv`, as a number. */
const cvVar = (): number =>
  Number((host.querySelector('[role="slider"]') as HTMLElement).style.getPropertyValue('--cv'));

/** One render-bus frame, 40 ms after the last one so the ~30 Hz gate opens. */
let clock = 0;
const frame = (): void => {
  clock += 40;
  act(() => runDraws());
};

const patch = (): void =>
  act(() => {
    useRackStore.getState().addCable({ id: 1, from: { uid: 2, jack: 'out' }, to: { uid: 1, jack: 'cv' } });
  });

const mount = (d: KnobDef): void => {
  root = createRoot(host);
  act(() => root.render(<Knob m={m} def={d} cv={0.25} />));
};

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  volts = 0;
  clock = 0;
  liveTaps = 0;
  taps.length = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  useRackStore.getState().reset();

  m = {
    uid: 1,
    def,
    jacks: { in: {}, out: {} },
    vals: { cut: 50 },
    sws: {},
    ext: {},
    cvGains: { cv: { node: fakeNode('att') as GainNode, target: { node: fakeNode('dsp'), idx: 1 } } },
  };
  lfo = {
    uid: 2,
    def: { ...def, id: 'lfo', knobs: [], ins: [] },
    jacks: { in: {}, out: { out: { node: fakeNode('lfo-out'), idx: 3 } } },
    vals: {},
    sws: {},
    ext: {},
  };
  useRackStore.getState().addModuleInstance(m, 0);
  useRackStore.getState().addModuleInstance(lfo, 0);

  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

describe('useCvMod', () => {
  it('animates the marker with the live control voltage', () => {
    mount(CUT);
    patch();
    // 0.5 travel (CUTOFF 50 of 0..100), and ±5 V is one whole travel: +1 V => +0.2.
    volts = 1;
    frame();
    expect(cvVar()).toBeCloseTo(0.7, 5);
    volts = -2;
    frame();
    expect(cvVar()).toBeCloseTo(0.1, 5);
    volts = 0;
    frame();
    expect(cvVar()).toBeCloseTo(0.5, 5);
  });

  it('taps the attenuverter gain, so the reading is post-attenuverter', () => {
    mount(CUT);
    patch();
    expect(taps).toEqual(['att']);
  });

  it('falls back to the patched source out jack when the knob has no attenuverter', () => {
    m.cvGains = undefined;
    mount(CUT);
    patch();
    expect(taps).toEqual(['lfo-out']);
  });

  it('holds the static attenuverter marker while the CV jack is unpatched', () => {
    mount(CUT);
    volts = 2.5;
    frame();
    expect(taps).toEqual([]);
    expect(cvVar()).toBeCloseTo(0.75, 5); // 0.5 travel + the 0.25 `cv` prop, unmoved
  });

  it('never taps a knob with no cvIn', () => {
    mount(PLAIN);
    patch();
    frame();
    expect(taps).toEqual([]);
  });

  it('throttles to ~30 Hz rather than writing every frame', () => {
    mount(CUT);
    patch();
    volts = 1;
    act(() => runDraws()); // same millisecond the tap opened on: gated
    expect(cvVar()).toBeCloseTo(0.5, 5); // still the seeded knob position
    frame();
    expect(cvVar()).toBeCloseTo(0.7, 5);
  });

  it('seeds --cv at the knob position so patching does not flick the marker to zero', () => {
    mount(CUT);
    volts = 2.5;
    patch(); // React stops writing --cv on this render; the effect must fill the gap
    expect(cvVar()).toBeCloseTo(0.5, 5);
  });

  it('drops the tap when the cable is pulled, and hands --cv back to React', () => {
    mount(CUT);
    patch();
    volts = 1;
    frame();
    expect(liveTaps).toBe(1);
    act(() => useRackStore.getState().removeCable(1));
    expect(liveTaps).toBe(0);
    expect(cvVar()).toBeCloseTo(0.75, 5);
    volts = -2;
    frame();
    expect(cvVar()).toBeCloseTo(0.75, 5); // no longer animating
  });

  it('unsubscribes from the render bus on unmount', () => {
    mount(CUT);
    patch();
    expect(liveTaps).toBe(1);
    act(() => root.unmount());
    expect(liveTaps).toBe(0);
    root = createRoot(host); // afterEach unmounts something valid
  });
});
