import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import type { ModuleDef } from '../../core/types';
import { filterModuleDefs, ModuleBrowser } from './module-browser';

vi.mock('../../engine/audio-context', () => ({
  getAudioContext: () => ({ createGain: () => ({ gain: { value: 0 }, connect: () => undefined }) }),
  loadWorklet: () => Promise.resolve(),
  isWorkletReady: () => true,
  isRunning: () => true,
  resume: () => undefined,
}));

const make = (id: string, name: string, sub: string, cat: ModuleDef['cat']): ModuleDef => ({
  id,
  name,
  sub,
  hp: 8,
  cat,
  knobs: [],
  ins: [],
  outs: [],
});

const DEFS: ModuleDef[] = [
  make('vco', 'VCO-1', 'ANALOG OSCILLATOR', 'SOURCES'),
  make('svf', 'SVF', 'STATE VARIABLE FILTER', 'FILTERS'),
  make('user:blip', 'BLIP', 'CUSTOM NOISE', 'CUSTOM'),
];

const ids = (q: string, cat: Parameters<typeof filterModuleDefs>[2]): string[] =>
  filterModuleDefs(DEFS, q, cat).map((d) => d.id);

describe('filterModuleDefs', () => {
  it('returns everything for an empty query in ALL', () => {
    expect(ids('', 'ALL')).toEqual(['vco', 'svf', 'user:blip']);
  });

  it('matches name, sub and id case-insensitively', () => {
    expect(ids('oscill', 'ALL')).toEqual(['vco']);
    expect(ids('svf', 'ALL')).toEqual(['svf']);
    expect(ids('  BLIP ', 'ALL')).toEqual(['user:blip']);
  });

  it('filters by category and combines with the query', () => {
    expect(ids('', 'FILTERS')).toEqual(['svf']);
    expect(ids('', 'CUSTOM')).toEqual(['user:blip']);
    expect(ids('noise', 'FILTERS')).toEqual([]);
  });

  it('returns nothing for a query that matches nothing', () => {
    expect(ids('zzz', 'ALL')).toEqual([]);
  });
});

describe('ModuleBrowser', () => {
  it('picks the highlighted entry on Enter and on click', () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const picked: string[] = [];
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => root.render(<ModuleBrowser onPick={(id) => picked.push(id)} onClose={vi.fn()} />));

    const search = host.querySelector('input');
    act(() => {
      search?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(picked).toHaveLength(1);

    const item = host.querySelector('.browser-item');
    act(() => item?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(picked[1]).toBe(picked[0]);

    act(() => root.unmount());
    host.remove();
  });

  it('points aria-activedescendant at the arrow-key highlight and traps Tab', () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => root.render(<ModuleBrowser onPick={vi.fn()} onClose={vi.fn()} />));

    const search = host.querySelector('input');
    const first = host.querySelector<HTMLElement>('.browser-item');
    expect(search?.getAttribute('aria-activedescendant')).toBe(first?.id);
    expect(first?.getAttribute('aria-selected')).toBe('true');

    act(() => {
      search?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });
    const items = [...host.querySelectorAll<HTMLElement>('.browser-item')];
    expect(search?.getAttribute('aria-activedescendant')).toBe(items[1]?.id);
    expect(items[1]?.getAttribute('aria-selected')).toBe('true');

    // Tab off the last focusable element wraps back into the dialog instead of leaving it.
    const last = items[items.length - 1];
    act(() => {
      last?.focus();
      last?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });
    expect(document.activeElement).toBe(search);

    act(() => root.unmount());
    host.remove();
  });
});
