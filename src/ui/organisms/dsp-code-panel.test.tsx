import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyDsp } from '../../features/user-modules/dsp-verify';
import type { UserModule } from '../../features/user-modules/schema';
import { DspCodePanel } from './dsp-code-panel';

vi.mock('../../features/user-modules/dsp-transpile', () => ({
  bindProcessorName: (src: string) => src,
  transpileDsp: () => ({ ok: true, code: 'built' }),
}));
vi.mock('../../features/user-modules/dsp-verify', () => ({ verifyDsp: vi.fn() }));

const um: UserModule = {
  slug: 'test-fold',
  def: {
    name: 'FOLD',
    sub: 'WAVEFOLDER',
    hp: 4,
    cat: 'UTILITY',
    knobs: [],
    ins: [],
    outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
  },
  dsp: 'registerProcessor("x", class {})',
  createdAt: 1,
  updatedAt: 1,
};

let host: HTMLDivElement;
let root: Root;

const button = (text: string): HTMLButtonElement => {
  const el = [...host.querySelectorAll('button')].find((b) => b.textContent === text);
  if (!el) throw new Error(`no ${text} button`);
  return el;
};

const click = async (text: string): Promise<void> => {
  await act(async () => {
    button(text).click();
  });
};

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<DspCodePanel um={um} onRegister={() => Promise.resolve(null)} />));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.clearAllMocks();
});

describe('DspCodePanel', () => {
  it('keeps Save disabled until verification succeeds', async () => {
    expect(button('Save').disabled).toBe(true);
    vi.mocked(verifyDsp).mockResolvedValue(null);
    await click('Verify');
    expect(button('Save').disabled).toBe(false);
  });

  it('renders the verification failure as text and leaves Save disabled', async () => {
    vi.mocked(verifyDsp).mockResolvedValue('DSP produced NaN or Infinity');
    await click('Verify');
    expect(host.querySelector('.editor-msg')?.textContent).toBe('DSP produced NaN or Infinity');
    expect(host.innerHTML).not.toContain('<script');
    expect(button('Save').disabled).toBe(true);
  });

  it('reports a registration that throws instead of losing it', async () => {
    vi.mocked(verifyDsp).mockResolvedValue(null);
    await click('Verify');
    act(() =>
      root.render(<DspCodePanel um={um} onRegister={() => Promise.reject(new Error('worklet exploded'))} />),
    );
    await click('Save');
    expect(host.querySelector('.editor-msg')?.textContent).toBe('worklet exploded');
    expect(button('Save').disabled).toBe(true);
  });

  it('editing the source invalidates a passed verification', async () => {
    vi.mocked(verifyDsp).mockResolvedValue(null);
    await click('Verify');
    const area = host.querySelector('textarea');
    act(() => {
      const desc = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
      desc?.set?.call(area, 'changed');
      area?.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(button('Save').disabled).toBe(true);
  });
});
