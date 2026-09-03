import { useReducer, type ReactNode } from 'react';
import type { ModuleInstance } from '../../engine/types';
import { postSampleToWorklet, SamplePicker } from '../../ui/molecules/sample-picker';
import { getSlicerExt } from './slicer.serialize';

/** Display-slot UI: just the shared sample picker, wired to `m.ext.slicer` and the worklet. */
export function SlicerParts({ m }: { m: ModuleInstance }): ReactNode {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const ext = getSlicerExt(m);
  return (
    <SamplePicker
      sampleId={ext.id}
      sampleName={ext.name}
      onLoaded={(id, data, meta) => {
        const next = getSlicerExt(m);
        next.id = id;
        next.name = meta.name;
        postSampleToWorklet(m, data);
        bump();
      }}
    />
  );
}

export const parts = SlicerParts;
