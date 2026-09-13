import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { ModalDialog } from './modal-dialog';

let host: HTMLDivElement;
let root: Root;
let opener: HTMLButtonElement;
let onClose: Mock;
let live = false;

const body = (extra = false) => (
  <>
    <button type="button">a</button>
    <button type="button">b</button>
    {extra && <button type="button">c</button>}
  </>
);

const show = (extra = false): void => {
  act(() =>
    root.render(
      <ModalDialog label="Test dialog" onClose={onClose}>
        {body(extra)}
      </ModalDialog>,
    ),
  );
};

const close = (): void => {
  act(() => root.unmount());
  live = false;
};

const items = (): HTMLButtonElement[] => [...host.querySelectorAll<HTMLButtonElement>('.modal button')];
const press = (el: Element, key: string, shiftKey = false): void => {
  act(() => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true }));
  });
};

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  onClose = vi.fn();
  opener = document.createElement('button');
  document.body.appendChild(opener);
  opener.focus();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  live = true;
  show();
});

afterEach(() => {
  if (live) close();
  host.remove();
  opener.remove();
});

describe('ModalDialog', () => {
  it('moves focus into the dialog when it opens', () => {
    expect(document.activeElement).toBe(items()[0]);
  });

  it('wraps Tab from the last focusable back to the first', () => {
    const [first, last] = [items()[0], items()[items().length - 1]];
    last?.focus();
    press(last!, 'Tab');
    expect(document.activeElement).toBe(first);
  });

  it('wraps Shift+Tab from the first focusable back to the last', () => {
    const [first, last] = [items()[0], items()[items().length - 1]];
    first?.focus();
    press(first!, 'Tab', true);
    expect(document.activeElement).toBe(last);
  });

  it('traps against the contents as they are now, not as they were on open', () => {
    show(true);
    const grown = items();
    expect(grown).toHaveLength(3);
    grown[2]?.focus();
    press(grown[2]!, 'Tab');
    expect(document.activeElement).toBe(grown[0]);

    show();
    const shrunk = items();
    expect(shrunk).toHaveLength(2);
    shrunk[0]?.focus();
    press(shrunk[0]!, 'Tab', true);
    expect(document.activeElement).toBe(shrunk[1]);
  });

  it('closes on Escape and restores focus to the opener', () => {
    press(items()[0]!, 'Escape');
    expect(onClose).toHaveBeenCalledTimes(1);
    close();
    expect(document.activeElement).toBe(opener);
  });

  it('closes on a backdrop click and restores focus to the opener', () => {
    const backdrop = host.querySelector('.modal-backdrop');
    act(() => {
      backdrop?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    close();
    expect(document.activeElement).toBe(opener);
  });

  it('ignores a mousedown that starts inside the dialog', () => {
    act(() => {
      items()[0]?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('restores focus to the opener when the caller closes it any other way', () => {
    close();
    expect(document.activeElement).toBe(opener);
  });
});
