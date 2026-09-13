import type { CSSProperties, DragEvent, KeyboardEvent, ReactNode } from 'react';
import { CAT_COLOR } from '../../core/types';
import { removeModule } from '../../engine/rack';
import type { ModuleInstance } from '../../engine/types';
import { layoutPanel } from '../../modules/panel-layout';
import { getSpec } from '../../modules/registry';
import { selectConnectedJacks, selectModuleRevision, useRackStore } from '../../state/rack-store';
import { useUiStore } from '../../state/ui-store';
import { ModuleHeader } from '../molecules/module-header';
import { PanelNodeView } from './module-panel-node';
import { useFaceplateImage } from './use-faceplate-image';

const pct = (n: number): string => `${(n * 100).toFixed(3)}%`;

export interface ModulePanelProps {
  m: ModuleInstance;
}

/** One faceplate. Subscribes to its own module revision only — a knob turn anywhere
    else in the rack must not re-render this panel. */
export function ModulePanel({ m }: ModulePanelProps): ReactNode {
  const uid = m.uid;
  useRackStore(selectModuleRevision(uid));
  const connected = useRackStore(selectConnectedJacks(uid));
  const selected = useUiStore((s) => s.selectedUid === uid);
  const spec = getSpec(m.def.id);
  const faceplate = useFaceplateImage(spec?.faceplate);

  const tint = CAT_COLOR[m.def.cat] ?? CAT_COLOR.CUSTOM;
  // The computed fallback layout repeats the module name; the header already shows it.
  const nodes = layoutPanel(m.def).nodes;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.target !== e.currentTarget) return;
    if (e.key !== 'Delete' && e.key !== 'Backspace') return;
    e.preventDefault();
    removeModule(uid);
  };

  const onDragStart = (e: DragEvent<HTMLDivElement>): void => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(uid));
  };

  return (
    <div
      className={`module-panel${m.def.dark ? ' dark' : ''}${selected ? ' selected' : ''}`}
      style={
        {
          '--cat': tint,
          '--hp-count': m.def.hp,
          backgroundImage: faceplate === null ? undefined : `url(${faceplate})`,
          backgroundSize: faceplate === null ? undefined : '100% 100%',
        } as CSSProperties
      }
      role="group"
      aria-label={`${m.def.name} module`}
      tabIndex={0}
      data-uid={uid}
      data-def-id={m.def.id}
      onClick={() => useUiStore.getState().setSelectedUid(uid)}
      onKeyDown={onKeyDown}
    >
      <i className="screws" aria-hidden="true" />
      <div className="panel-grab" draggable onDragStart={onDragStart} title="Drag to move">
        <ModuleHeader name={m.def.name} sub={m.def.sub} color={tint} />
      </div>
      <button
        type="button"
        className="panel-x"
        aria-label={`Remove ${m.def.name}`}
        onClick={() => removeModule(uid)}
      >
        ×
      </button>
      {nodes.map((n) => (
        <div
          key={n.id}
          className="panel-node"
          style={{ left: pct(n.x), top: pct(n.y), width: pct(n.w), height: pct(n.h) }}
        >
          <PanelNodeView node={n} m={m} connected={connected} parts={spec?.parts} />
        </div>
      ))}
    </div>
  );
}
