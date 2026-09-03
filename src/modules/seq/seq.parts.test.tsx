import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ModuleInstance } from '../../engine/types';
import { SeqParts } from './seq.parts';
import { getSeq } from './seq.serialize';

const m = (): ModuleInstance =>
  ({
    uid: 1,
    def: { id: 'seq' },
    jacks: { in: {}, out: {} },
    vals: {},
    sws: {},
    ext: {},
  }) as unknown as ModuleInstance;

let host: HTMLDivElement;
let root: Root;
let inst: ModuleInstance;

const pitchInput = (): HTMLInputElement => {
  const el = host.querySelector<HTMLInputElement>('input.seq-pitch');
  if (!el) throw new Error('no pitch input');
  return el;
};

const type = (text: string): void =>
  act(() => {
    const el = pitchInput();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  inst = m();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<SeqParts m={inst} />));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('SeqParts pitch entry', () => {
  it('lets a negative pitch be typed one character at a time', () => {
    type('-');
    // a number input reports "" for a lone "-": what matters is that it is not snapped to 0
    expect(pitchInput().value).not.toBe('0');
    expect(getSeq(inst).steps[0]?.pitch).toBe(0);
    type('-5');
    expect(getSeq(inst).steps[0]?.pitch).toBe(-5);
  });

  it('clamps to the step range', () => {
    type('99');
    expect(getSeq(inst).steps[0]?.pitch).toBe(24);
  });
});
