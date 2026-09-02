import { act, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CodeEditor } from './code-editor';

function Harness({ initial }: { initial: string }): ReactNode {
  const [value, setValue] = useState(initial);
  const [tabs, setTabs] = useState(false);
  return (
    <CodeEditor
      value={value}
      onChange={setValue}
      label="Module DSP source"
      insertTabs={tabs}
      onInsertTabs={setTabs}
    />
  );
}

let host: HTMLDivElement;
let root: Root;

const area = (): HTMLTextAreaElement => {
  const el = host.querySelector('textarea');
  if (!el) throw new Error('no textarea');
  return el;
};

const gutter = (): string => host.querySelector('.gutter')?.textContent ?? '';

/** React listens for native input events; set the value through the DOM setter. */
const type = (text: string): void =>
  act(() => {
    const el = area();
    const desc = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
    desc?.set?.call(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<Harness initial={'a\nb'} />));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('CodeEditor', () => {
  it('labels the textarea', () => {
    const label = host.querySelector(`label[for="${area().id}"]`);
    expect(label?.textContent).toBe('Module DSP source');
    expect(area().getAttribute('spellcheck')).toBe('false');
    expect(area().getAttribute('wrap')).toBe('off');
  });

  it('line numbers track the content', () => {
    expect(gutter()).toBe('1\n2');
    type('a\nb\nc\nd');
    expect(gutter()).toBe('1\n2\n3\n4');
    type('a');
    expect(gutter()).toBe('1');
  });

  it('Tab escapes the field unless insert-tabs is enabled', () => {
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    act(() => {
      area().dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(false);
    expect(area().value).toBe('a\nb');
  });

  it('inserts a tab once the checkbox is on', () => {
    const box = host.querySelector('input[type="checkbox"]');
    act(() => (box as HTMLInputElement).click());
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    act(() => {
      const el = area();
      el.setSelectionRange(0, 0);
      el.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    expect(area().value).toBe('\ta\nb');
  });
});
