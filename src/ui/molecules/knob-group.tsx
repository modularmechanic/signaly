import type { ReactNode } from 'react';
import type { KnobDef } from '../../core/types';
import type { ModuleInstance } from '../../engine/types';
import { Fader } from '../atoms/fader';
import { Knob } from '../atoms/knob';

export interface KnobGroupProps {
  m: ModuleInstance;
  knobs: readonly KnobDef[];
}

export function KnobGroup({ m, knobs }: KnobGroupProps): ReactNode {
  return (
    <div className="knob-group">
      {knobs.map((k) => (k.fader ? <Fader key={k.id} m={m} def={k} /> : <Knob key={k.id} m={m} def={k} />))}
    </div>
  );
}
