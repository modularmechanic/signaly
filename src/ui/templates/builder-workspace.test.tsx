import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ModuleDef } from '../../core/types';
import { registerSpec, unregisterSpec } from '../../modules/registry';
import { useRackStore } from '../../state/rack-store';
import { BuilderWorkspace } from './builder-workspace';

const h = vi.hoisted(() => ({ finish: [] as ((r: { ok: true; id: string }) => void)[] }));

vi.mock('../../engine/audio-context', () => ({
  getAudioContext: () => ({
    createGain: () => ({ gain: { value: 0 }, connect: () => undefined, disconnect: () => undefined }),
    destination: {},
  }),
  loadWorklet: () => Promise.resolve(),
  isWorkletReady: () => true,
  isRunning: () => true,
  resume: () => undefined,
}));

vi.mock('../../features/user-modules/runtime-registry', () => ({
  registerUserModule: () =>
    new Promise((res: (r: { ok: true; id: string }) => void) => {
      h.finish.push(res);
    }),
  unregisterUserModule: () => undefined,
}));

vi.mock('../organisms/dsp-code-panel', () => ({ DspCodePanel: () => null }));
vi.mock('../organisms/faceplate-editor', () => ({ FaceplateEditor: () => null }));
vi.mock('../organisms/user-module-library', () => ({
  UserModuleLibrary: ({ onLoad }: { onLoad: (um: unknown) => void }) => (
    <button onClick={() => onLoad({ slug: 'tbuild', def: {}, dsp: '', createdAt: 1, updatedAt: 1 })}>
      load
    </button>
  ),
}));

const DEF: ModuleDef = {
  id: 'user:tbuild',
  name: 'TBUILD',
  sub: 'fixture',
  hp: 4,
  cat: 'UTILITY',
  knobs: [],
  ins: [],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};

vi.mock('../../features/llm/client', () => ({
  generateModule: () =>
    Promise.resolve({
      slug: 'tbuild',
      dsp: 'export function process() {}',
      def: {
        name: 'TBUILD',
        sub: 'fixture',
        hp: 4,
        cat: 'UTILITY',
        knobs: [],
        ins: [],
        outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
      },
    }),
}));

const STALE: ModuleDef = { ...DEF, id: 'user:tstale', name: 'TSTALE' };

let host: HTMLDivElement;
let root: Root;
let rows0: number;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  useRackStore.getState().reset();
  registerSpec({ def: DEF });
  registerSpec({ def: STALE });
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  h.finish.length = 0;
  rows0 = useRackStore.getState().rows.length;
  act(() => root.render(<BuilderWorkspace />));
});

afterEach(() => {
  unregisterSpec(DEF.id);
  unregisterSpec(STALE.id);
  host.remove();
});

/** Type into the chat and hit Send, leaving registration pending. */
async function startGenerating(): Promise<void> {
  const ta = host.querySelector('textarea');
  const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  act(() => {
    set?.call(ta, 'a wobbler');
    ta?.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const send = [...host.querySelectorAll('button')].find((b) => b.textContent === 'Send');
  await act(async () => send?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
}

describe('BuilderWorkspace registration', () => {
  it('previews the module when registration finishes while mounted', async () => {
    await startGenerating();
    await act(async () => h.finish[0]?.({ ok: true, id: DEF.id }));
    expect(useRackStore.getState().rows).toHaveLength(rows0 + 1);
    act(() => root.unmount());
    expect(useRackStore.getState().rows).toHaveLength(rows0);
  });

  it('drops a registration that a later one has superseded', async () => {
    const load = (): void => {
      const b = [...host.querySelectorAll('button')].find((x) => x.textContent === 'load');
      act(() => b?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    };
    load();
    load();
    expect(h.finish).toHaveLength(2);
    // the second request answers first: the stale first one must not replace its preview
    await act(async () => h.finish[1]?.({ ok: true, id: DEF.id }));
    await act(async () => h.finish[0]?.({ ok: true, id: STALE.id }));
    const previewed = Object.values(useRackStore.getState().modules);
    expect(previewed.map((m) => m.def.id)).toEqual([DEF.id]);
    expect(useRackStore.getState().rows).toHaveLength(rows0 + 1);
    act(() => root.unmount());
    expect(useRackStore.getState().rows).toHaveLength(rows0);
  });

  it('adds nothing to the rack when it finishes after the builder unmounts', async () => {
    await startGenerating();
    act(() => root.unmount());
    await act(async () => h.finish[0]?.({ ok: true, id: DEF.id }));
    expect(useRackStore.getState().rows).toHaveLength(rows0);
    expect(Object.keys(useRackStore.getState().modules)).toHaveLength(0);
  });
});
