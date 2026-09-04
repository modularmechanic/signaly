import { useEffect, useRef, useState, type ReactNode } from 'react';
import { getAudioContext, resume } from '../../engine/audio-context';
import { addModule, addRow } from '../../engine/rack';
import { cancelArm, getArmed, subscribeArm } from '../../hooks/patch-state';
import { useRackStore, type RackState } from '../../state/rack-store';
import { useUiStore } from '../../state/ui-store';
import { hasAnyKey } from '../../storage/api-key-store';
import { Button } from '../atoms/button';
import { CableCanvas } from '../molecules/cable-canvas';
import { ModuleBrowser } from '../organisms/module-browser';
import { PatchMenu } from '../organisms/patch-menu';
import { RackRow } from '../organisms/rack-row';
import { SettingsDialog } from '../organisms/settings-dialog';
import { ZoomControls } from '../molecules/zoom-controls';

const say = (text: string): void => useUiStore.getState().setNotice(text);

const jackLabel = (s: RackState, j: { uid: number; jack: string }): string =>
  `${s.modules[j.uid]?.def.name ?? 'module'} ${j.jack}`;

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
  if (s.rows.length > prev.rows.length) return say(`Row ${s.rows.length} added`);
  const last = s.cables[s.cables.length - 1];
  if (s.cables.length > prev.cables.length && last)
    say(`Patched ${jackLabel(s, last.from)} to ${jackLabel(s, last.to)}`);
  else if (s.cables.length < prev.cables.length) say('Cable removed');
}

export function RackWorkspace(): ReactNode {
  const rows = useRackStore((s) => s.rows);
  const browserOpen = useUiStore((s) => s.browserOpen);
  const settingsOpen = useUiStore((s) => s.settingsOpen);
  const notice = useUiStore((s) => s.notice);
  const [patchesOpen, setPatchesOpen] = useState(false);
  const [targetRow, setTargetRow] = useState(0);
  const opener = useRef<HTMLElement | null>(null);
  const rack = useRef<HTMLElement | null>(null);

  const ui = useUiStore.getState();
  const anyModal = browserOpen || settingsOpen || patchesOpen;
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
    const offArm = subscribeArm((a) => {
      if (a) return say(`Armed ${a.jackId} ${a.dir === 'in' ? 'input' : 'output'} — pick a destination`);
      // armJack clears the arm *before* connecting: only a still-unchanged cable list is a cancel.
      const n = useRackStore.getState().cables.length;
      queueMicrotask(() => {
        if (useRackStore.getState().cables.length === n) say('Patch cancelled');
      });
    });
    const offRack = useRackStore.subscribe(announce);
    return () => {
      offArm();
      offRack();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      if (getArmed()) return cancelArm();
      useUiStore.getState().setBrowserOpen(false);
      useUiStore.getState().setSettingsOpen(false);
      setPatchesOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!anyModal) opener.current?.focus();
  }, [anyModal]);

  const openBrowser = (index: number): void => {
    opener.current = document.activeElement as HTMLElement | null;
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
          <Button
            disabled={!hasKey}
            title={hasKey ? 'Module builder' : 'Add an API key in Settings to use the builder'}
            onClick={() => ui.setView('builder')}
          >
            Builder
          </Button>
          {!hasKey && <span className="topbar-hint">Builder needs an API key — see Settings</span>}
          <span className="topbar-gap" />
          <Button onClick={() => openBrowser(rows.length - 1)}>+ Module</Button>
          <Button onClick={() => addRow()}>+ Row</Button>
          <Button
            onClick={(e) => {
              opener.current = e.currentTarget;
              setPatchesOpen(true);
            }}
          >
            Patches
          </Button>
          <Button
            onClick={(e) => {
              opener.current = e.currentTarget;
              ui.setSettingsOpen(true);
            }}
          >
            Settings
          </Button>
        </nav>

        <p className="live-region" role="status" aria-live="polite">
          {notice}
        </p>
      </header>

      <main className="rack-scroll" ref={rack}>
        {rows.map((row, i) => (
          <RackRow key={row.id} row={row} index={i} onAddHere={openBrowser} />
        ))}
      </main>

      <CableCanvas />
      <ZoomControls rack={rack} />

      {browserOpen && <ModuleBrowser onPick={pick} onClose={() => ui.setBrowserOpen(false)} />}
      {patchesOpen && <PatchMenu onClose={() => setPatchesOpen(false)} />}
      {settingsOpen && <SettingsDialog onClose={() => ui.setSettingsOpen(false)} />}
    </div>
  );
}
