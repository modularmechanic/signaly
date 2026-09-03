import type { CSSProperties, ReactNode } from 'react';

const WHITES = [0, 2, 4, 5, 7, 9, 11];
const BLACKS = [1, 3, 6, 8, 10];
// black pitch-class -> the white-key boundary it sits on, in sevenths
const BLACK_BOUND: Record<number, number> = { 1: 1, 3: 2, 6: 4, 8: 5, 10: 6 };
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export interface MiniPianoProps {
  /** length-12 mask: which pitch-classes are lit */
  active: boolean[];
  root?: number;
  playing?: number | null;
  color?: string;
  /** octave the caller actually plays — only used to name the keys (MIDI 60 = C4) */
  octave?: number;
  onToggle?: (pc: number) => void;
}

/** One-octave note picker: 12 pitch-classes, black keys positioned on white boundaries. */
export function MiniPiano({ active, root, playing, color, octave = 4, onToggle }: MiniPianoProps): ReactNode {
  const cls = (pc: number, base: string): string =>
    `mpk ${base}${active[pc] ? ' on' : ''}${root === pc ? ' root' : ''}${playing === pc ? ' playing' : ''}`;
  const name = (pc: number): string => `${NAMES[pc] ?? ''}${octave}`;
  return (
    <div className="mini-piano" style={{ '--mp-c': color ?? 'var(--cat)' } as CSSProperties}>
      {WHITES.map((pc) => (
        <button
          key={pc}
          type="button"
          className={cls(pc, 'w')}
          aria-label={name(pc)}
          aria-pressed={active[pc] === true}
          onClick={() => onToggle?.(pc)}
        />
      ))}
      {BLACKS.map((pc) => (
        <button
          key={pc}
          type="button"
          className={cls(pc, 'b')}
          aria-label={name(pc)}
          aria-pressed={active[pc] === true}
          style={{ left: `calc(${BLACK_BOUND[pc] ?? 0} / 7 * 100% - 9px)` }}
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.(pc);
          }}
        />
      ))}
    </div>
  );
}
