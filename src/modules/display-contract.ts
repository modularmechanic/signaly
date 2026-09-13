import type { Display, ModuleDef } from '../core/types';
import type { ModuleInstance } from '../engine/types';

// Everything a contract rule is allowed to read. `ModuleDef` satisfies it, and so does the
// user-module `UserDef` (`ModuleDef` minus id/worklet/native) — `native` is optional here.
export type ContractDef = Pick<ModuleDef, 'knobs'> &
  Partial<Pick<ModuleDef, 'sws' | 'display' | 'screen' | 'native'>>;

export interface DisplayRow {
  /** the module's side of the bargain in one line — the author-facing text for this row */
  needs: string;
  /** decidable from the def alone; null when satisfied */
  fromDef?(def: ContractDef): string | null;
  /** decidable only from a running instance; null when the renderer has its feed */
  fromLive?(m: ModuleInstance): string | null;
}

/** `EnvPanel` reads these four knob ids by name; the `env` row is what keeps a def honest. */
export const ENV_KNOBS: readonly string[] = ['a', 'd', 's', 'r'];

const nativeOnly = (what: string) => (def: ContractDef): string | null =>
  def.native === undefined ? `${what} can only be created by a native audio graph, so this def needs \`native\`` : null;

function meterFromLive(m: ModuleInstance): string | null {
  if (m.ext.analysis !== undefined && !('spectrum' in m.sws && 'phase' in m.sws))
    return 'm.ext.analysis is exposed but the SPECTRUM / PHASE switches that reveal it are missing';
  if (m.ext.analysis !== undefined) return null;
  if (m.ext.analyserL !== undefined && m.ext.analyserR !== undefined) return null;
  if (m.node) return null;
  return 'no analysers on m.ext, and no worklet to post a { t: "meter" } feed';
}

function envFromDef(def: ContractDef): string | null {
  for (const id of ENV_KNOBS) {
    const k = def.knobs.find((n) => n.id === id);
    if (!k) return `the env curve reads knobs a/d/s/r — knob "${id}" is missing`;
    if (k.fmt === undefined) return `the env chips print knob "${id}" through its fmt, which is not set`;
  }
  return null;
}

/** The table that used to live as prose in docs/system-architecture.md. One row per
    `Display`: what the module must provide, and the two checks that hold it to it. */
export const DISPLAY_CONTRACT: Record<Display, DisplayRow> = {
  scope: {
    needs: 'a native graph assigning an AnalyserNode to m.ext.analyser',
    fromDef: nativeOnly('an AnalyserNode on m.ext.analyser'),
    fromLive: (m) => (m.ext.analyser === undefined ? 'm.ext.analyser was never assigned' : null),
  },
  meter: {
    needs:
      'a worklet posting { t: "meter", in, gr?, open? } in dB, or a native assigning m.ext.analyserL + m.ext.analyserR, or m.ext.analysis with both a "spectrum" and a "phase" switch',
    fromDef: (def) => {
      const ids = new Set((def.sws ?? []).map((s) => s.id));
      if (ids.has('spectrum') === ids.has('phase')) return null;
      return 'the analyser screen is revealed by a "spectrum" and a "phase" switch together — one alone can never show it';
    },
    fromLive: meterFromLive,
  },
  steps: {
    needs: 'a worklet posting { t: "step", i, n?, pattern? }',
    fromDef: (def) =>
      def.native === undefined ? null : 'a native graph has no port to post a { t: "step" } feed on',
    fromLive: (m) => (m.node ? null : 'no worklet to post a { t: "step" } feed'),
  },
  env: {
    needs: 'knobs a, d, s, r, each with a fmt',
    fromDef: envFromDef,
  },
  piano: {
    needs: 'a native graph assigning { held, trigOn, trigOff } to m.ext.kbd',
    fromDef: nativeOnly('the m.ext.kbd tracker'),
    fromLive: (m) => (m.ext.kbd === undefined ? 'm.ext.kbd was never assigned' : null),
  },
  text: {
    needs: 'a native assigning a string to m.ext.text, or a worklet posting { t: "text", v }',
    fromLive: (m) =>
      m.node || typeof m.ext.text === 'string'
        ? null
        : 'm.ext.text was never assigned and there is no worklet to post one',
  },
};

/** Why this def's display cannot render, or null when it can. Pass a live instance to check
    its feed too; pass null to check only what the def itself decides (the sweep, check-def). */
export function whyNotReady(def: ContractDef, m: ModuleInstance | null): string | null {
  if (def.screen === true && def.display !== undefined)
    return `screen reserves the display box for a parts component, so it cannot also name the "${def.display}" renderer`;
  if (def.display === undefined) return null;
  const row = DISPLAY_CONTRACT[def.display];
  return row.fromDef?.(def) ?? (m === null ? null : (row.fromLive?.(m) ?? null));
}
