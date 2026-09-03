import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MiniPiano } from './mini-piano';

const OFF = Array.from({ length: 12 }, () => false);

let host: HTMLDivElement;
let root: Root;

const keys = (): HTMLButtonElement[] => [...host.querySelectorAll('button')];

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('MiniPiano', () => {
  it('names every key by note and octave', () => {
    act(() => root.render(<MiniPiano active={OFF} />));
    const names = keys().map((b) => b.getAttribute('aria-label'));
    expect(names).toHaveLength(12);
    expect(new Set(names).size).toBe(12);
    expect(names).toContain('C4');
    expect(names).toContain('C#4');
    expect(names).toContain('B4');
  });

  it('the octave follows the caller', () => {
    act(() => root.render(<MiniPiano active={OFF} octave={2} />));
    expect(keys()[0]?.getAttribute('aria-label')).toBe('C2');
  });

  it('a named key toggles its own pitch class', () => {
    const onToggle = vi.fn();
    act(() => root.render(<MiniPiano active={OFF} onToggle={onToggle} />));
    const cs = keys().find((b) => b.getAttribute('aria-label') === 'C#4');
    act(() => cs?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(onToggle).toHaveBeenCalledWith(1);
  });
});
