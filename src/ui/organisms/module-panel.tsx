import type { CSSProperties, DragEvent, KeyboardEvent, ReactNode } from 'react';
import { kitOf, knobLookOf, switchLookOf } from '../../core/look';
import { CAT_COLOR } from '../../core/types';
import { removeModule } from '../../engine/rack';
import type { ModuleInstance } from '../../engine/types';
import { layoutPanel } from '../../modules/panel-layout';
import { getSpec } from '../../modules/registry';
import { selectConnectedJacks, useRackStore } from '../../state/rack-store';
import { useUiStore } from '../../state/ui-store';
import { Screw } from '../atoms/screw';
import { ModuleHeader } from '../molecules/module-header';
import { PanelNodeView } from './module-panel-node';
import { useFaceplateImage } from './use-faceplate-image';

const pct = (n: number): string => `${(n * 100).toFixed(3)}%`;

/** 'knob:oct' -> 'oct'. Panel node ids are `<kind>:<def id>`. */
const defId = (nodeId: string): string => nodeId.slice(nodeId.indexOf(':') + 1);

export interface ModulePanelProps {
  m: ModuleInstance;
}

/** One faceplate. Holds no per-value subscription: every control subscribes for itself, so a
    knob turn re-renders the knob, not the panel. */
export function ModulePanel({ m }: ModulePanelProps): ReactNode {
  const uid = m.uid;
  const connected = useRackStore(selectConnectedJacks(uid));
  const selected = useUiStore((s) => s.selectedUid === uid);
  const faceplate = useFaceplateImage(m.def.id);

  const spec = getSpec(m.def.id);
  const kit = kitOf(m.def);
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
          backgroundSize: '100% 100%',
        } as CSSProperties
      }
      role="group"
      data-plate={kit.plate}
      data-head={kit.head}
      data-silk={kit.silk}
      data-type={kit.type}
      data-jack={kit.jack}
      aria-label={`${m.def.name} module`}
      tabIndex={0}
      data-uid={uid}
      onClick={() => useUiStore.getState().setSelectedUid(uid)}
      onKeyDown={onKeyDown}
    >
      <Screw at="tl" />
      <Screw at="tr" />
      <Screw at="bl" />
      <Screw at="br" />
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
      {/* The hardware look lives on the node, never on the faceplate: exactly one ancestor
          carries data-knob / data-sw, so `[data-knob='x'] .knob` can never match two rules. */}
      {nodes.map((n) => (
        <div
          key={n.id}
          className="panel-node"
          data-knob={knobLookOf(
            m.def,
            m.def.knobs.find((k) => k.id === defId(n.id)),
          )}
          data-sw={switchLookOf(
            m.def,
            m.def.sws?.find((sw) => sw.id === defId(n.id)),
          )}
          style={{ left: pct(n.x), top: pct(n.y), width: pct(n.w), height: pct(n.h) }}
        >
          <PanelNodeView node={n} m={m} connected={connected} parts={spec?.parts} />
        </div>
      ))}
    </div>
  );
}
