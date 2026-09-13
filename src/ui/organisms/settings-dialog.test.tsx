import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROVIDERS, setKey } from '../../storage/api-key-store';
import { SettingsDialog } from './settings-dialog';

let host: HTMLDivElement;
let root: Root;
const onClose = vi.fn();

const btn = (text: string): HTMLButtonElement | undefined =>
  [...host.querySelectorAll('button')].find((b) => b.textContent === text);
const click = (el: Element | undefined): void => {
  act(() => void el?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
};

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  onClose.mockClear();
  localStorage.clear();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<SettingsDialog onClose={onClose} />));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('SettingsDialog', () => {
  it('renders as a labelled modal dialog', () => {
    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-label')).toBe('Settings');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect([...host.querySelectorAll('h3')].map((h) => h.textContent)).toEqual(['API keys', 'Rack', 'Data']);
  });

  it('closes from the header button', () => {
    click(btn('×'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('asks before it offers to delete everything', () => {
    expect(btn('Delete everything, permanently')).toBeUndefined();
    click(btn('Clear all data…'));
    expect(btn('Delete everything, permanently')).toBeDefined();
    click(btn('Cancel'));
    expect(btn('Delete everything, permanently')).toBeUndefined();
  });

  it('offers an active-provider choice only once a key is stored', () => {
    const labels = (): string[] =>
      [...host.querySelectorAll('.select-label')].map((l) => l.textContent ?? '');
    expect(labels()).not.toContain('Active provider');

    // Seeded through the store rather than the field: typing a key kicks off a model fetch.
    setKey(PROVIDERS[0]!, 'sk-test');
    act(() => root.render(<SettingsDialog onClose={onClose} />));
    expect(labels()).toContain('Active provider');
  });
});
