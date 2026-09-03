import { useReducer, type ReactNode } from 'react';
import type { ModuleInstance } from '../../engine/types';
import { postSampleToWorklet, SamplePicker } from '../../ui/molecules/sample-picker';
import { getCloudExt } from './cloud.serialize';

/** Display-slot UI: just the shared sample picker, wired to `m.ext.cloud` and the worklet. */
export function CloudParts({ m }: { m: ModuleInstance }): ReactNode {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const ext = getCloudExt(m);
  return (
    <SamplePicker
      sampleId={ext.id}
      sampleName={ext.name}
      onLoaded={(id, data, meta) => {
        const next = getCloudExt(m);
        next.id = id;
        next.name = meta.name;
        postSampleToWorklet(m, data);
        bump();
      }}
    />
  );
}

export const parts = CloudParts;
