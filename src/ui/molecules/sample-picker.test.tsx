import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const decodeSample = vi.fn();
const getSample = vi.fn();
const saveSample = vi.fn();
vi.mock('../../storage/sample-store', () => ({
  decodeSample: (...a: unknown[]) => decodeSample(...a),
  getSample: (...a: unknown[]) => getSample(...a),
  saveSample: (...a: unknown[]) => saveSample(...a),
  newSampleId: () => 'new-id',
}));

const { SamplePicker } = await import('./sample-picker');

let host: HTMLDivElement;
let root: Root;

const flush = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const fileInput = (): HTMLInputElement => {
  const el = host.querySelector('input[type="file"]');
  if (!el) throw new Error('no file input');
  return el as HTMLInputElement;
};

const pickFile = async (file: File): Promise<void> => {
  const input = fileInput();
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  decodeSample.mockReset();
  getSample.mockReset();
  saveSample.mockReset().mockResolvedValue(undefined);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('SamplePicker', () => {
  it('decodes and saves a picked file, then reports it to the caller', async () => {
    decodeSample.mockResolvedValue({ data: new Float32Array([0, 1, 0, -1]), duration: 2.5 });
    const onLoaded = vi.fn();
    act(() => root.render(<SamplePicker sampleId={undefined} sampleName={undefined} onLoaded={onLoaded} />));

    const file = new File(['x'], 'kick.wav', { type: 'audio/wav' });
    await pickFile(file);

    expect(saveSample).toHaveBeenCalledWith('new-id', file);
    expect(onLoaded).toHaveBeenCalledWith('new-id', expect.any(Float32Array), {
      name: 'kick.wav',
      duration: 2.5,
    });
    expect(host.textContent).toContain('kick.wav');
    expect(host.textContent).toContain('2.5s');
  });

  it('never saves a file that fails to decode', async () => {
    decodeSample.mockResolvedValue({ error: 'too big' });
    const onLoaded = vi.fn();
    act(() => root.render(<SamplePicker sampleId={undefined} sampleName={undefined} onLoaded={onLoaded} />));

    await pickFile(new File(['x'], 'huge.wav'));

    expect(saveSample).not.toHaveBeenCalled();
    expect(onLoaded).not.toHaveBeenCalled();
    expect(host.textContent).toContain('too big');
  });

  it('reports "no sample" instead of crashing when a saved id is gone from storage', async () => {
    getSample.mockResolvedValue(undefined);
    act(() => root.render(<SamplePicker sampleId="gone" sampleName="kick.wav" onLoaded={vi.fn()} />));
    await flush();

    expect(host.textContent).toContain('no sample');
    expect(decodeSample).not.toHaveBeenCalled();
  });

  it('reloads a sample restored from a patch by id', async () => {
    getSample.mockResolvedValue(new Blob(['x']));
    decodeSample.mockResolvedValue({ data: new Float32Array([1]), duration: 1.2 });
    const onLoaded = vi.fn();
    act(() => root.render(<SamplePicker sampleId="old-id" sampleName="snare.wav" onLoaded={onLoaded} />));
    await flush();

    expect(onLoaded).toHaveBeenCalledWith('old-id', expect.any(Float32Array), {
      name: 'snare.wav',
      duration: 1.2,
    });
    expect(saveSample).not.toHaveBeenCalled();
    expect(host.textContent).toContain('snare.wav');
  });
});
