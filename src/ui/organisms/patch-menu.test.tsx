import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useRackStore } from '../../state/rack-store';
import { useUiStore } from '../../state/ui-store';
import { listPatches } from '../../storage/patch-store';
import { PatchMenu } from './patch-menu';

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  useRackStore.getState().reset();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<PatchMenu onClose={() => undefined} />));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('PatchMenu', () => {
  it('saves the rack when the name field is submitted with Enter', () => {
    const input = host.querySelector<HTMLInputElement>('input[type="text"]');
    const form = host.querySelector('form');
    if (!input || !form) throw new Error('no patch save form');
    // React tracks the controlled value on the node, so go through the native setter.
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    act(() => {
      setValue?.call(input, 'Enter patch');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(listPatches().map((p) => p.name)).toEqual(['Enter patch']);
    expect(host.querySelector('.patch-feedback')?.textContent).toBe('Saved Enter patch');
  });

  it('does not show the rack workspace notice as its own feedback', () => {
    act(() => useUiStore.getState().setNotice('Added VCO'));
    expect(host.querySelector('.patch-feedback')?.textContent).toBe('');
  });
});
