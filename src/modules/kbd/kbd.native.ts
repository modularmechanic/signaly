import { getAudioContext } from '../../engine/audio-context';
import type { ModuleInstance, NativeSpec } from '../../engine/types';

/** QWERTY tracker row: 'a' = C4 (0 V), rising chromatically. */
const KEYS: Record<string, number> = {
  a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11,
  k: 12, o: 13, l: 14, p: 15, ';': 16,
};
const BASE = 60;

/** True while the user is typing into a field — the rack must not steal those keys. */
function typing(): boolean {
  const el = document.activeElement;
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA';
}

interface KbdExt {
  held: number[];
  trigOn: (note: number) => void;
  trigOff: (note: number) => void;
  detach: () => void;
}

const extOf = (m: ModuleInstance): KbdExt | undefined => m.ext.kbd as KbdExt | undefined;

/** KEYBOARD — CV/gate/trig source. `m.ext.kbd` carries `held` (MIDI notes, last one sounding)
    plus `trigOn`/`trigOff` so a piano UI drives the same path as the physical keys. */
export const native: NativeSpec = {
  audio(m) {
    const ac = getAudioContext();
    const src = (): ConstantSourceNode => {
      const n = ac.createConstantSource();
      n.offset.value = 0;
      n.start();
      return n;
    };
    const cv = src();
    const gate = src();
    const trig = src();
    (m.natives ??= []).push(cv, gate, trig);
    m.jacks.out.cv = { node: cv, idx: 0 };
    m.jacks.out.gate = { node: gate, idx: 0 };
    m.jacks.out.trig = { node: trig, idx: 0 };

    const ext: KbdExt = {
      held: [],
      trigOn: (note) => {
        if (ext.held.includes(note)) return;
        ext.held.push(note);
        cv.offset.setTargetAtTime((note - BASE) / 12, ac.currentTime, 0.001);
        gate.offset.setValueAtTime(5, ac.currentTime);
        trig.offset.setValueAtTime(5, ac.currentTime);
        trig.offset.setValueAtTime(0, ac.currentTime + 0.004);
      },
      trigOff: (note) => {
        ext.held = ext.held.filter((n) => n !== note);
        const last = ext.held[ext.held.length - 1];
        if (last === undefined) gate.offset.setValueAtTime(0, ac.currentTime);
        else cv.offset.setTargetAtTime((last - BASE) / 12, ac.currentTime, 0.001);
      },
      detach: () => {
        window.removeEventListener('keydown', onDown);
        window.removeEventListener('keyup', onUp);
      },
    };

    function noteFor(e: KeyboardEvent): number | undefined {
      if (e.ctrlKey || e.metaKey || e.altKey || typing()) return undefined;
      const semi = KEYS[e.key.toLowerCase()];
      return semi === undefined ? undefined : BASE + semi;
    }
    function onDown(e: KeyboardEvent): void {
      const note = noteFor(e);
      if (note === undefined || e.repeat) return;
      e.preventDefault();
      ext.trigOn(note);
    }
    function onUp(e: KeyboardEvent): void {
      const note = noteFor(e);
      if (note !== undefined) ext.trigOff(note);
    }
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    m.ext.kbd = ext;
  },

  dispose(m) {
    extOf(m)?.detach();
    for (const n of m.natives ?? []) if (n instanceof ConstantSourceNode) n.stop();
  },
};
