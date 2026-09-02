import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateModule } from '../../features/llm/client';
import BuilderPage from '../pages/builder-page';
import { ModuleBuilderChat } from './module-builder-chat';

vi.mock('../../features/llm/client', () => ({
  generateModule: vi.fn(),
  activeProvider: () => null,
  canGenerateImages: () => false,
  generateFaceplate: vi.fn(),
}));
vi.mock('../../storage/api-key-store', () => ({ hasAnyKey: () => false }));

let host: HTMLDivElement;
let root: Root;

const buttons = (): HTMLButtonElement[] => [...host.querySelectorAll('button')];
const button = (text: string): HTMLButtonElement => {
  const el = buttons().find((b) => b.textContent === text);
  if (!el) throw new Error(`no ${text} button`);
  return el;
};

const typePrompt = (text: string): void =>
  act(() => {
    const el = host.querySelector('textarea');
    const desc = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
    desc?.set?.call(el, text);
    el?.dispatchEvent(new Event('input', { bubbles: true }));
  });

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.clearAllMocks();
});

describe('ModuleBuilderChat', () => {
  it('appends the provider error as text and offers an explicit retry', async () => {
    vi.mocked(generateModule).mockResolvedValue({ error: 'the model did not return JSON' });
    act(() => root.render(<ModuleBuilderChat onModule={() => Promise.resolve(null)} />));
    typePrompt('a wavefolder');
    await act(async () => {
      button('Send').click();
    });
    const error = host.querySelector('.chat-msg.error .chat-text');
    expect(error?.textContent).toBe('the model did not return JSON');
    expect(button('Retry with this error')).toBeTruthy();
    expect(vi.mocked(generateModule)).toHaveBeenCalledTimes(1);
  });
});

describe('BuilderPage without a key', () => {
  it('shows the explainer and never calls the provider', () => {
    act(() => root.render(<BuilderPage />));
    expect(host.querySelector('.chat-log')).toBeNull();
    expect(button('Open settings')).toBeTruthy();
    expect(vi.mocked(generateModule)).not.toHaveBeenCalled();
  });
});
