import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { KIND_NAME, type JackDef, type Kind } from '../../core/types';
import type { ModuleInstance } from '../../engine/types';
import {
  armJack,
  beginDrag,
  cancelArm,
  getArmed,
  subscribe,
  unpatchJack,
} from '../../hooks/jack-interaction';
import { jackKey, registerJack, unregisterJack, type JackDir } from '../../hooks/jack-registry';

const KIND_GLYPH: Record<Kind, string> = { a: '●', p: '◆', g: '■', c: '▲' };

export interface JackProps {
  m: ModuleInstance;
  def: JackDef;
  dir: JackDir;
  patched: boolean;
}

export function Jack({ m, def, dir, patched }: JackProps): ReactNode {
  const ref = useRef<HTMLButtonElement>(null);
  const [armed, setArmed] = useState(false);
  const uid = m.uid;

  // Any outcome can move the arm, so re-read it rather than tracking each kind.
  useEffect(() => {
    const read = (): void => {
      const a = getArmed();
      setArmed(!!a && a.uid === uid && a.dir === dir && a.def.id === def.id);
    };
    return subscribe(read);
  }, [uid, dir, def.id]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    registerJack({ uid, dir, def, el });
    return () => unregisterJack(uid, dir, def.id);
  }, [uid, dir, def]);

  const arm = (): void => void armJack({ uid, dir, def });

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    const el = ref.current;
    if (el) beginDrag({ uid, dir, def, el }, e.nativeEvent);
  };
  const unpatch = (): void => void unpatchJack({ uid, dir, def });

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>): void => {
    if (e.key === 'Escape') return void cancelArm();
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (!patched) return;
      // The panel also removes the whole module on Delete; never let this bubble that far.
      e.preventDefault();
      e.stopPropagation();
      return unpatch();
    }
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    arm();
  };

  const label = `${def.label} ${dir === 'in' ? 'input' : 'output'}, ${KIND_NAME[def.kind]}${
    patched ? ', patched — press Delete to disconnect' : ''
  }`;

  return (
    <span className={'jack-cell' + (dir === 'out' ? ' out' : '')}>
      <span className="jack-label">{def.label}</span>
      <button
        ref={ref}
        type="button"
        className={`jack jack-${def.kind}${dir === 'out' ? ' out' : ''}${patched ? ' patched' : ''}`}
        data-jack-key={jackKey(uid, dir, def.id)}
        aria-pressed={armed}
        aria-label={label}
        title={label}
        onClick={arm}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onDoubleClick={unpatch}
      >
        <span className="jack-glyph" aria-hidden="true">
          {KIND_GLYPH[def.kind]}
        </span>
      </button>
    </span>
  );
}
