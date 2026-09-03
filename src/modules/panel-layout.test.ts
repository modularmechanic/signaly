import { describe, expect, it } from 'vitest';
import type { ModuleDef } from '../core/types';
import { forgetPanel, layoutPanel } from './panel-layout';

const def = (over: Partial<ModuleDef> = {}): ModuleDef => ({
  id: 'lay',
  name: 'LAY',
  sub: 'test',
  hp: 8,
  cat: 'FILTERS',
  worklet: 'lay',
  knobs: [
    { id: 'a', label: 'A', min: 0, max: 1, initial: 0 },
    { id: 'b', label: 'B', min: 0, max: 1, initial: 0, big: true },
    { id: 'c', label: 'C', min: 0, max: 1, initial: 0, fader: true },
  ],
  sws: [{ id: 's', label: 'S', options: ['x', 'y'] }],
  ins: [{ id: 'in', label: 'IN', kind: 'a' }],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
  display: 'scope',
  ...over,
});

describe('panel-layout', () => {
  it('returns authored geometry untouched', () => {
    const panel = { nodes: [{ id: 'knob:a', kind: 'knob' as const, x: 0, y: 0, w: 1, h: 1 }] };
    expect(layoutPanel(def({ id: 'authored', panel }))).toBe(panel);
  });

  it('computes every control inside the 0..1 box', () => {
    forgetPanel('lay');
    const { nodes } = layoutPanel(def());
    const ids = nodes.map((n) => n.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'knob:a',
        'knob:b',
        'fader:c',
        'switch:s',
        'display:scope',
        'in:in',
        'out:out',
      ]),
    );
    for (const n of nodes) {
      for (const v of [n.x, n.y, n.w, n.h]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('spans big knobs across both columns and drops to one column below 5 HP', () => {
    forgetPanel('lay');
    const wide = layoutPanel(def());
    const big = wide.nodes.find((n) => n.id === 'knob:b');
    const small = wide.nodes.find((n) => n.id === 'knob:a');
    expect(big?.w).toBeGreaterThan(small?.w ?? 1);

    forgetPanel('narrow');
    const narrow = layoutPanel(def({ id: 'narrow', hp: 4 }));
    const a = narrow.nodes.find((n) => n.id === 'knob:a');
    expect(a?.w).toBeCloseTo(big?.w ?? 0);
  });

  it('emits one node per declared led and still returns an authored panel verbatim', () => {
    forgetPanel('lit');
    const led = layoutPanel(def({ id: 'lit', leds: ['clk'] })).nodes.find((n) => n.id === 'led:clk');
    expect(led).toBeDefined();
    if (!led) return;
    expect(led.kind).toBe('led');
    for (const v of [led.x, led.y, led.w, led.h]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    const panel = { nodes: [{ id: 'led:clk', kind: 'led' as const, x: 0, y: 0, w: 1, h: 1 }] };
    expect(layoutPanel(def({ id: 'lit-authored', leds: ['clk'], panel }))).toBe(panel);
  });

  it('memoises per def id', () => {
    forgetPanel('lay');
    expect(layoutPanel(def())).toBe(layoutPanel(def()));
  });
});
