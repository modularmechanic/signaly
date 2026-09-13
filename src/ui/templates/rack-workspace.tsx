import { useEffect, useRef, useState, type ReactNode } from 'react';
import { KIND_NAME } from '../../core/types';
import { getAudioContext, resume } from '../../engine/audio-context';
import { addModule, addRow } from '../../engine/rack';
import { subscribe, type JackRef, type Outcome } from '../../hooks/jack-interaction';
import { useRackStore, type RackState } from '../../state/rack-store';
import { useUiStore } from '../../state/ui-store';
import { hasAnyKey } from '../../storage/api-key-store';
import { Button } from '../atoms/button';
import { CableCanvas } from '../molecules/cable-canvas';
import { ZoomControls } from '../molecules/zoom-controls';
import { ModuleBrowser } from '../organisms/module-browser';
import { PatchMenu } from '../organisms/patch-menu';
import { RackRow } from '../organisms/rack-row';
import { SettingsDialog } from '../organisms/settings-dialog';

const say = (text: string): void => useUiStore.getState().setNotice(text);

// A jack as a person hears it: module, printed label, signal kind — never the internal id.
const jackLabel = (j: JackRef): string =>
  `${useRackStore.getState().modules[j.uid]?.def.name ?? 'module'} ${j.def.label}`;

/** Announce what a patching interaction reported it did. */
function sayOutcome(o: Outcome): void {
  if (o.type === 'armed')
    say(
      `Armed ${jackLabel(o.jack)} ${o.jack.dir === 'in' ? 'input' : 'output'}, ` +
        `${KIND_NAME[o.jack.def.kind]} — pick a destination`,
    );
  else if (o.type === 'cancelled') say('Patch cancelled');
  else if (o.type === 'connected')
    say(`Patched ${jackLabel(o.from)} to ${jackLabel(o.to)}, ${KIND_NAME[o.from.def.kind]}`);
  else if (o.type === 'disconnected') say(o.count === 1 ? 'Cable removed' : `${o.count} cables removed`);
}

/** Announce every structural rack change once, from a single store subscription. */
function announce(s: RackState, prev: RackState): void {
  if (s.revision === prev.revision) return;
  const added = Object.keys(s.modules).find((k) => !(k in prev.modules));
  const removed = Object.keys(prev.modules).find((k) => !(k in s.modules));
  if (added !== undefined) {
    const uid = Number(added);
    const name = s.modules[uid]?.def.name ?? 'module';
    // An add can spill into a row of its own, so say where it actually landed.
    const at = s.rows.findIndex((r) => r.uids.includes(uid));
    return say(at < 0 ? `Added ${name}` : `Added ${name} to row ${at + 1}`);
  }
  if (removed !== undefined) return say(`Removed ${prev.modules[Number(removed)]?.def.name ?? 'module'}`);
  if (s.rows.length > prev.rows.length) say(`Row ${s.rows.length} added`);
  // Cables are not diffed here: jack-interaction reports its own outcomes.
}

export function RackWorkspace(): ReactNode {
  const rows = useRackStore((s) => s.rows);
  const browserOpen = useUiStore((s) => s.browserOpen);
  const settingsOpen = useUiStore((s) => s.settingsOpen);
  const patchesOpen = useUiStore((s) => s.patchesOpen);
  const notice = useUiStore((s) => s.notice);
  const [targetRow, setTargetRow] = useState(0);
  const rack = useRef<HTMLElement | null>(null);

  const ui = useUiStore.getState();
  const hasKey = hasAnyKey();

  // Browsers start the context suspended; the first gesture in the page resumes it.
  useEffect(() => {
    const wake = (): void => {
      getAudioContext();
      resume();
    };
    window.addEventListener('pointerdown', wake, { once: true, passive: true });
    window.addEventListener('keydown', wake, { once: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
    };
  }, []);

  useEffect(() => {
    const offPatch = subscribe(sayOutcome);
    const offRack = useRackStore.subscribe(announce);
    return () => {
      offPatch();
      offRack();
    };
  }, []);

  const openBrowser = (index: number): void => {
    setTargetRow(index);
    ui.setBrowserOpen(true);
  };

  const pick = (defId: string): void => {
    ui.setBrowserOpen(false);
    try {
      addModule(defId, targetRow);
    } catch {
      // A worklet whose processor never registered throws on construction.
      say(`${defId} could not start — its DSP failed to load.`);
    }
  };

  return (
    <div className="workspace">
      {/* Chrome and status line stick together: a topbar that wraps on a phone would otherwise
          leave the live region pinned at a hard-coded offset, floating over the rack. */}
      <header className="rack-head">
        <nav className="topbar">
          <span className="brand">SIGNALY</span>
          <Button pressed onClick={() => ui.setView('rack')}>
            Rack
          </Button>
          {/* Hidden rather than disabled: without a key the builder cannot do anything, and a
              greyed-out button with an explanation beside it was two pieces of furniture for a
              feature the user has not set up. */}
          {hasKey && (
            <Button title="Module builder" onClick={() => ui.setView('builder')}>
              Builder
            </Button>
          )}
          <span className="topbar-gap" />
          <Button onClick={() => openBrowser(rows.length - 1)}>+ Module</Button>
          <Button onClick={() => addRow()}>+ Row</Button>
          <Button onClick={() => ui.setPatchesOpen(true)}>Patches</Button>
          <Button onClick={() => ui.setSettingsOpen(true)}>Settings</Button>
        </nav>

        <p className="live-region" role="status" aria-live="polite">
          {notice}
        </p>
      </header>

      {/* The rack is the one scrollable region now, so it carries the keyboard affordance the
          per-row containers used to: Chrome focuses overflow containers on its own, Firefox
          does not. */}
      <main className="rack-scroll" ref={rack} tabIndex={0} aria-label="Rack modules">
        {rows.map((row, i) => (
          <RackRow key={row.id} row={row} index={i} onAddHere={openBrowser} />
        ))}
      </main>

      <CableCanvas rack={rack} />
      <ZoomControls rack={rack} />

      {browserOpen && <ModuleBrowser onPick={pick} onClose={() => ui.setBrowserOpen(false)} />}
      {patchesOpen && <PatchMenu onClose={() => ui.setPatchesOpen(false)} />}
      {settingsOpen && <SettingsDialog onClose={() => ui.setSettingsOpen(false)} />}
    </div>
  );
}
