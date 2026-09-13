import { describe, expect, it } from 'vitest';
import type { KnobDef } from '../core/types';
import type { ModuleInstance } from '../engine/types';
import { def as adsr } from './adsr/adsr.def';
import { whyNotReady } from './display-contract';
import { def as out } from './out/out.def';
import { def as seq } from './seq/seq.def';

const inst = (over: Partial<ModuleInstance>): ModuleInstance => ({
  uid: 1,
  def: seq,
  jacks: { in: {}, out: {} },
  vals: {},
  sws: {},
  ext: {},
  ...over,
});

// The sweep proves every built-in passes. These prove the rules can still fail — each case is a
// shape that used to render a blank screen and report nothing.
describe('whyNotReady', () => {
  it('rejects a screen that also names a renderer', () => {
    expect(whyNotReady({ ...seq, display: 'steps' }, null)).toMatch(/cannot also name/);
  });

  it('rejects half of the analyser switch pair, and an analyser with no pair at all', () => {
    const half = [{ id: 'spectrum', label: 'SPECTRUM', options: ['OFF', 'ON'] }];
    expect(whyNotReady({ ...out, sws: half }, null)).toMatch(/one alone can never show it/);
    expect(whyNotReady({ ...out, sws: [] }, inst({ def: out, ext: { analysis: {} } }))).toMatch(
      /SPECTRUM \/ PHASE switches/,
    );
  });

  it('rejects an env panel missing a knob or a fmt', () => {
    const noR = adsr.knobs.filter((k) => k.id !== 'r');
    expect(whyNotReady({ ...adsr, knobs: noR }, null)).toMatch(/"r" is missing/);
    // fmt is required by the type now; the runtime guard still has to hold for defs from elsewhere.
    const noFmt = adsr.knobs.map((k) =>
      k.id === 's' ? ({ ...k, fmt: undefined } as unknown as KnobDef) : k,
    );
    expect(whyNotReady({ ...adsr, knobs: noFmt }, null)).toMatch(/fmt, which is not set/);
  });

  it('rejects a display neither implementation route can feed', () => {
    // A native has no port to post a step feed on; a worklet cannot build an AnalyserNode.
    expect(whyNotReady({ ...seq, screen: undefined, display: 'steps', native: 'seq' }, null)).toMatch(
      /no port/,
    );
    expect(whyNotReady({ ...seq, screen: undefined, display: 'scope' }, null)).toMatch(/m\.ext\.analyser/);
  });

  it('passes a def that provides its side of the row', () => {
    expect(whyNotReady(adsr, null)).toBeNull();
    expect(whyNotReady(seq, null)).toBeNull();
    const live = inst({ def: out, ext: { analysis: {} }, sws: { spectrum: 0, phase: 0 } });
    expect(whyNotReady(out, live)).toBeNull();
  });
});
