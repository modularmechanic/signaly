import { useReducer, type ReactNode } from 'react';
import type { ModuleInstance } from '../../engine/types';
import { postSampleToWorklet, SamplePicker } from '../../ui/molecules/sample-picker';
import { getSamplerExt } from './sampler.serialize';

/** Display-slot UI: just the shared sample picker, wired to `m.ext.sampler` and the worklet. */
export function SamplerParts({ m }: { m: ModuleInstance }): ReactNode {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const ext = getSamplerExt(m);
  return (
    <SamplePicker
      sampleId={ext.id}
      sampleName={ext.name}
      onLoaded={(id, data, meta) => {
        const next = getSamplerExt(m);
        next.id = id;
        next.name = meta.name;
        postSampleToWorklet(m, data);
        bump();
      }}
    />
  );
}

export const parts = SamplerParts;
