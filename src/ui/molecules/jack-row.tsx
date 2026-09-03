import type { ReactNode } from 'react';
import type { JackDef } from '../../core/types';
import type { ModuleInstance } from '../../engine/types';
import type { JackDir } from '../../hooks/patch-state';
import { jackSlot } from '../../state/rack-store';
import { Jack } from '../atoms/jack';

export interface JackRowProps {
  m: ModuleInstance;
  jacks: readonly JackDef[];
  dir: JackDir;
  /** from selectConnectedJacks(uid) — keys are jackSlot(dir, jackId) */
  connected: ReadonlySet<string>;
}

export function JackRow({ m, jacks, dir, connected }: JackRowProps): ReactNode {
  return (
    <div className={'jack-row ' + dir}>
      {jacks.map((j) => (
        <Jack key={j.id} m={m} def={j} dir={dir} patched={connected.has(jackSlot(dir, j.id))} />
      ))}
    </div>
  );
}
