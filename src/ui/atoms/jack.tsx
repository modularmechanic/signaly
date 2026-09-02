import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import type { JackDef, Kind } from '../../core/types';
import type { ModuleInstance } from '../../engine/types';
import {
  armJack,
  cancelArm,
  jackKey,
  registerJack,
  startJackDrag,
  subscribeArm,
  unpatchInput,
  unregisterJack,
  type JackDir,
} from '../../hooks/patch-state';

const KIND_NAME: Record<Kind, string> = { a: 'audio', p: 'pitch', g: 'gate', c: 'CV' };
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

  useEffect(
    () => subscribeArm((a) => setArmed(!!a && a.uid === uid && a.dir === dir && a.jackId === def.id)),
    [uid, dir, def.id],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    registerJack({ uid, jackId: def.id, dir, kind: def.kind, el });
    return () => unregisterJack(uid, dir, def.id);
  }, [uid, dir, def.id, def.kind]);

  const arm = (): void => armJack(uid, dir, def.id);

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    const el = ref.current;
    if (el) startJackDrag({ uid, jackId: def.id, dir, kind: def.kind, el }, e.nativeEvent);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>): void => {
    if (e.key === 'Escape') return cancelArm();
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    arm();
  };

  const label = `${def.label} ${dir === 'in' ? 'input' : 'output'}, ${KIND_NAME[def.kind]}${
    patched ? ', patched' : ''
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
        onDoubleClick={() => dir === 'in' && unpatchInput(uid, def.id)}
      >
        <span className="jack-glyph" aria-hidden="true">
          {KIND_GLYPH[def.kind]}
        </span>
      </button>
    </span>
  );
}
