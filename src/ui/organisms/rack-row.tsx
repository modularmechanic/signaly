import type { CSSProperties, DragEvent, ReactNode } from 'react';
import { moveModule, removeRow, rowUsedHp } from '../../engine/rack';
import type { RackRow as Row } from '../../engine/types';
import { useRackStore } from '../../state/rack-store';
import { useSettingsStore } from '../../state/settings-store';
import { useUiStore } from '../../state/ui-store';
import { Button } from '../atoms/button';
import { ModulePanel } from './module-panel';

/** Explain a refused drop instead of silently relocating it. */
function rowFullNotice(r: { needed: number; free: number }): void {
  useUiStore.getState().setNotice(`Row full — ${r.needed} HP needed, ${r.free} free`);
}

export interface RackRowProps {
  row: Row;
  index: number;
  onAddHere: (index: number) => void;
}

export function RackRow({ row, index, onAddHere }: RackRowProps): ReactNode {
  const modules = useRackStore((s) => s.modules);
  const width = useSettingsStore((s) => s.rowWidthHp);
  const used = rowUsedHp(row.id);
  const over = used > width;

  const onDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    const uid = Number(e.dataTransfer.getData('text/plain'));
    if (!Number.isFinite(uid) || uid <= 0) return;
    const panels = [...e.currentTarget.querySelectorAll<HTMLElement>('.module-panel')];
    const before = panels.findIndex((el) => {
      const r = el.getBoundingClientRect();
      return e.clientX < r.left + r.width / 2;
    });
    const result = moveModule(uid, index, before < 0 ? panels.length : before);
    if (result !== true) rowFullNotice(result);
  };

  return (
    <section className="rack-row-shell" aria-label={`Rack row ${index + 1}`}>
      <header className="row-head">
        <span className={'row-hp' + (over ? ' over' : '')}>
          {used} / {width} HP
        </span>
        <span className={'row-bar' + (over ? ' over' : '')}>
          <i style={{ '--fill': Math.min(1, used / width) } as CSSProperties} />
        </span>
        <Button onClick={() => onAddHere(index)}>+ Module</Button>
        {row.uids.length === 0 && <Button onClick={() => removeRow(row.id)}>Remove row</Button>}
      </header>
      <div
        className="rack-row"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={onDrop}
      >
        {row.uids.map((uid) => {
          const m = modules[uid];
          return m ? <ModulePanel key={uid} m={m} /> : null;
        })}
      </div>
    </section>
  );
}
