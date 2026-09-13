import { describe, expect, it } from 'vitest';
import type { JackDef, ModuleDef } from '../core/types';
import {
  FADER_PAD_PX,
  FADER_W_PX,
  fitPanel,
  forgetPanel,
  HP_PX,
  JACK_D_PX,
  layoutPanel,
  MIN_CONTROL_PX,
  PANEL_H,
} from './panel-layout';

const def = (over: Partial<ModuleDef> = {}): ModuleDef => ({
  id: 'lay',
  name: 'LAY',
  sub: 'test',
  hp: 8,
  cat: 'FILTERS',
  worklet: 'lay',
  knobs: [
    { id: 'a', label: 'A', min: 0, max: 1, initial: 0, fmt: 'f1' },
    { id: 'b', label: 'B', min: 0, max: 1, initial: 0, fmt: 'f1', big: true },
    { id: 'c', label: 'C', min: 0, max: 1, initial: 0, fmt: 'f1', fader: true },
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

  it('reserves the same screen box for `screen` as for a named display', () => {
    forgetPanel('lay');
    const named = layoutPanel(def()).nodes.find((n) => n.id === 'display:scope');
    forgetPanel('lay');
    const reserved = layoutPanel(def({ display: undefined, screen: true })).nodes.find(
      (n) => n.id === 'display:screen',
    );
    expect(reserved).toEqual({ ...named, id: 'display:screen' });
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

  it('never emits a fader row shorter than a fader can render', () => {
    // 16 faders at 4 columns is four rows of ~73px — the exact failure ADR-0001 documents.
    const knobs = Array.from({ length: 16 }, (_, i) => ({
      id: `f${i}`,
      label: 'F',
      min: 0,
      max: 1,
      initial: 0,
      fmt: 'f1' as const,
      fader: true,
    }));
    forgetPanel('strip');
    const { nodes } = layoutPanel(def({ id: 'strip', hp: 16, knobs, sws: undefined }));
    const faders = nodes.filter((n) => n.kind === 'fader');
    expect(faders).toHaveLength(16);
    for (const f of faders) expect(f.h * PANEL_H).toBeGreaterThanOrEqual(MIN_CONTROL_PX.fader);
  });

  it('reports the fit verdict and the narrowest hp that lays out', () => {
    const plain = def({ knobs: [{ id: 'a', label: 'A', min: 0, max: 1, initial: 0, fmt: 'f1' }] });
    expect(fitPanel(plain, 120)).toEqual({ fits: true, hp: 8 });
    // The stock fixture's fader lands at ~74px in an 8 HP panel already carrying a big knob,
    // a switch and a scope — under the minimum, and no column count can rescue it.
    expect(fitPanel(def(), 120).fits).toBe(false);

    const many = (p: string, n: number): JackDef[] =>
      Array.from({ length: n }, (_, i) => ({ id: `${p}${i}`, label: 'J', kind: 'a' as const }));
    const dense = def({ id: 'dense', hp: 1, knobs: [], ins: many('i', 8), outs: many('o', 8) });
    const verdict = fitPanel(dense, 120);
    expect(verdict.fits).toBe(false);
    expect(verdict.hp).not.toBeNull();
    if (verdict.hp === null) return;
    expect(fitPanel({ ...dense, hp: verdict.hp }, 120).fits).toBe(true);
    expect(fitPanel({ ...dense, hp: verdict.hp - 1 }, 120).fits).toBe(false);

    const hopeless = def({ id: 'hopeless', knobs: [], ins: many('i', 60), outs: many('o', 60) });
    expect(fitPanel(hopeless, 120)).toEqual({ fits: false, hp: null });
  });

  it('never packs a column narrower than the art it holds', () => {
    // The defect: the column widths were CSS pixels restated in TS, so a coarse-pointer rule
    // that widened `.jack` to 46px left the layout packing 43px columns. Both widths now have
    // one owner; these are the invariants that owner exists to keep.
    const many = (p: string, n: number): JackDef[] =>
      Array.from({ length: n }, (_, i) => ({ id: `${p}${i}`, label: 'J', kind: 'a' as const }));
    for (let hp = 2; hp <= 20; hp++) {
      const id = `cols${hp}`;
      forgetPanel(id);
      const { nodes } = layoutPanel(
        def({
          id,
          hp,
          // Enough faders that the column widening in bandsFor runs out to its widest, which
          // is where FADER_COL_PX is the only thing holding a column above the art it draws.
          knobs: Array.from({ length: 12 }, (_, i) => ({
            id: `f${i}`,
            label: 'F',
            min: 0,
            max: 1,
            initial: 0,
            fmt: 'f1' as const,
            fader: true,
          })),
          sws: undefined,
          display: undefined,
          ins: many('i', 8),
          outs: many('o', 8),
        }),
      );
      const px = (w: number): number => w * hp * HP_PX;
      for (const n of nodes) {
        if (n.kind === 'in' || n.kind === 'out') expect(px(n.w)).toBeGreaterThanOrEqual(JACK_D_PX);
        if (n.kind === 'fader') expect(px(n.w)).toBeGreaterThanOrEqual(FADER_W_PX + 2 * FADER_PAD_PX);
      }
    }
  });

  it('memoises per def id', () => {
    forgetPanel('lay');
    expect(layoutPanel(def())).toBe(layoutPanel(def()));
  });
});
