import { useRef, useState, type ReactNode } from 'react';
import type { ModuleInstance } from '../../engine/types';
import { useRenderFrame } from '../../hooks/module-api';
import { MiniPiano } from '../atoms/mini-piano';

interface Kbd {
  held: number[];
  trigOn(n: number): void;
  trigOff(n: number): void;
}

const BASE = 60;
const OFF: boolean[] = Array.from({ length: 12 }, () => false);

/** Mirrors `m.ext.kbd.held` (the QWERTY tracker writes it outside React) and plays
    a note back through the same trigOn/trigOff path when a key is clicked. */
export function PianoDisplay({ m }: { m: ModuleInstance }): ReactNode {
  const [active, setActive] = useState<boolean[]>(OFF);
  const bits = useRef(0);

  useRenderFrame(() => {
    const held = (m.ext.kbd as Kbd | undefined)?.held ?? [];
    let next = 0;
    for (const n of held) next |= 1 << (((n % 12) + 12) % 12);
    if (next === bits.current) return;
    bits.current = next;
    setActive(Array.from({ length: 12 }, (_, pc) => (next & (1 << pc)) !== 0));
  });

  const toggle = (pc: number): void => {
    const kbd = m.ext.kbd as Kbd | undefined;
    if (!kbd) return;
    kbd.trigOn(BASE + pc);
    window.setTimeout(() => kbd.trigOff(BASE + pc), 180);
  };

  return <MiniPiano active={active} octave={Math.floor(BASE / 12) - 1} onToggle={toggle} />;
}
