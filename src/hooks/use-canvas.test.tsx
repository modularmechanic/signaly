import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCanvas } from './use-canvas';

const ctx = { save: vi.fn(), restore: vi.fn(), setTransform: vi.fn() } as unknown as CanvasRenderingContext2D;
const queries: { media: string; fire: () => void }[] = [];

const setDpr = (v: number): void => {
  Object.defineProperty(window, 'devicePixelRatio', { value: v, configurable: true });
};

function Probe(): ReactNode {
  const ref = useCanvas(() => undefined, { width: 100, height: 50 });
  return <canvas ref={ref} />;
}

let host: HTMLDivElement;
let root: Root;
const canvas = (): HTMLCanvasElement => host.querySelector('canvas') as HTMLCanvasElement;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  queries.length = 0;
  setDpr(1);
  HTMLCanvasElement.prototype.getContext = (() => ctx) as unknown as HTMLCanvasElement['getContext'];
  window.matchMedia = ((media: string) => {
    const listeners = new Set<() => void>();
    queries.push({ media, fire: () => listeners.forEach((fn) => fn()) });
    return {
      media,
      matches: true,
      addEventListener: (_: string, fn: () => void): void => {
        listeners.add(fn);
      },
      removeEventListener: (_: string, fn: () => void): void => {
        listeners.delete(fn);
      },
    };
  }) as unknown as typeof window.matchMedia;
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<Probe />));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('useCanvas', () => {
  it('sizes the backing store by DPR', () => {
    expect(canvas().width).toBe(100);
    expect(canvas().height).toBe(50);
    expect(queries[0]?.media).toBe('(resolution: 1dppx)');
  });

  it('resizes when the window moves to a different-DPI display', () => {
    setDpr(2);
    act(() => queries[0]?.fire());
    expect(canvas().width).toBe(200);
    expect(canvas().height).toBe(100);
    // re-armed on the new ratio, so a move back is caught too
    expect(queries[1]?.media).toBe('(resolution: 2dppx)');
    setDpr(1);
    act(() => queries[1]?.fire());
    expect(canvas().width).toBe(100);
  });
});
