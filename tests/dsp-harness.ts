import type { Mock } from 'vitest';
import { vi } from 'vitest';
import type { Params } from '../src/engine/dsp-prelude';
import { seedParams } from '../src/engine/node-factory';
import { getSpec } from '../src/modules/registry';

/** The sample rate every DSP test runs at. */
export const SR = 48000;

/** A live processor instance: the surface a `.dsp.test.ts` may touch. */
export interface Proc {
  p: Params;
  port: { onmessage: ((e: MessageEvent) => void) | null; postMessage: Mock };
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
}

type Ctor = new (o?: { processorOptions?: { p?: Params } }) => Proc;

class FakeProcessor {
  port = { onmessage: null as ((e: MessageEvent) => void) | null, postMessage: vi.fn() };
}

// Lazy: calling a loader is what evaluates the .dsp.ts, so nothing runs before the stubs are in.
const loaders = import.meta.glob('../src/modules/*/*.dsp.ts');

// registerProcessor runs at .dsp.ts module scope, and vitest caches the module — so the class
// is captured on first import, by processor name, and reused for every later instance.
const registered = new Map<string, Ctor>();

function stubWorkletGlobals(): void {
  vi.stubGlobal('sampleRate', SR);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  vi.stubGlobal('registerProcessor', (name: string, c: Ctor) => void registered.set(name, c));
}

/** Every module slug that ships a `<slug>.dsp.ts`. */
export function dspSlugs(): string[] {
  return Object.keys(loaders)
    .map((path) => path.split('/').at(-2) ?? '')
    .filter(Boolean)
    .sort();
}

/** One live DSP instance, seeded exactly as the live rack seeds it: every knob and switch
    initial from the module's own def, with `over` standing in for a moved control. */
export async function loadProcessor(slug: string, over?: Params): Promise<Proc> {
  const def = getSpec(slug)?.def;
  if (!def) throw new Error(`${slug}: no module def is registered under that id`);
  if (!def.worklet) throw new Error(`${slug}: is a native module, so it has no processor to load`);
  const loader = loaders[`../src/modules/${slug}/${slug}.dsp.ts`];
  if (!loader) throw new Error(`${slug}: no ${slug}.dsp.ts`);
  // Order is the whole point: the globals must exist before the module body evaluates.
  stubWorkletGlobals();
  await loader();
  const C = registered.get(def.worklet);
  if (!C) throw new Error(`${slug}.dsp.ts registered no processor named '${def.worklet}'`);
  return new C({ processorOptions: { p: { ...seedParams(def), ...over } } });
}
