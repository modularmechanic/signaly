import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { applySnapshot } from '../../engine/snapshot';
import { useUiStore } from '../../state/ui-store';
import {
  deletePatch,
  downloadPatch,
  listPatches,
  MAX_PATCH_BYTES,
  parsePatchFile,
  renamePatch,
  savePatch,
  type Patch,
} from '../../storage/patch-store';
import { EXAMPLES_BY_GENRE, type ExamplePatch } from '../../patches/examples';
import { Button } from '../atoms/button';
import { ModalDialog } from '../molecules/modal-dialog';

export function PatchMenu({ onClose }: { onClose: () => void }): ReactNode {
  const [list, setList] = useState<Patch[]>(() => listPatches());
  const [name, setName] = useState('');
  // Own line, not the rack's global notice — that one still holds "Added VCO" from before.
  const [feedback, note] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const setNotice = useUiStore((s) => s.setNotice);

  const refresh = (): void => setList(listPatches());

  // A patch names modules by id; one that is not installed takes its cables with it. That has to
  // outlive this dialog, so it goes to the rack's notice line, not the local feedback.
  const missingNote = (missing: string[]): void => {
    if (missing.length === 0) return;
    setNotice(`Not installed: ${missing.join(', ')} — those modules and their cables were skipped.`);
  };

  const save = (): void => {
    const saved = savePatch(name);
    setName('');
    refresh();
    note(`Saved ${saved.name}`);
  };

  const load = (p: Patch | ExamplePatch): void => {
    missingNote(applySnapshot(p.snapshot));
    note(`Loaded ${p.name}`);
    onClose();
  };

  const rename = (p: Patch): void => {
    const next = window.prompt('Patch name', p.name);
    if (next === null) return;
    renamePatch(p.id, next);
    refresh();
  };

  const importFile = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > MAX_PATCH_BYTES) return note('Patch file is too large.');
    try {
      const patch = parsePatchFile(await f.text());
      missingNote(applySnapshot(patch.snapshot));
      savePatch(patch.name, patch.snapshot, patch.tags);
      refresh();
      note(`Imported ${patch.name}`);
    } catch (err) {
      note(err instanceof Error ? err.message : 'Could not import that file.');
    }
  };

  return (
    <ModalDialog label="Patches" onClose={onClose}>
      <header className="modal-head">
        <h2>Patches</h2>
        <button type="button" className="modal-x" aria-label="Close patches" onClick={onClose}>
          ×
        </button>
      </header>

      <form
        className="patch-save"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <input
          type="text"
          value={name}
          maxLength={60}
          placeholder="Patch name"
          aria-label="Patch name"
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit">Save current rack</Button>
        <Button onClick={() => fileInput.current?.click()}>Import…</Button>
        <input
          ref={fileInput}
          className="visually-hidden"
          type="file"
          accept="application/json,.json"
          aria-label="Import patch file"
          onChange={(e) => void importFile(e)}
        />
      </form>

      {/* Twenty-one examples read as a wall unless they are grouped: the first tag is the
          genre, the rest (tempo, key) ride along as chips. */}
      {EXAMPLES_BY_GENRE.map((group) => (
        <section key={group.genre}>
          <h3 className="patch-heading">{group.genre}</h3>
          <ul className="patch-list">
            {group.patches.map((p) => (
              <li key={p.id}>
                <button type="button" className="patch-name" onClick={() => load(p)}>
                  {p.name}
                </button>
                {p.tags.slice(1).map((t) => (
                  <span key={t} className="patch-tag">
                    {t}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <h3 className="patch-heading">Saved</h3>
      <ul className="patch-list">
        {list.map((p) => (
          <li key={p.id}>
            <button type="button" className="patch-name" onClick={() => load(p)}>
              {p.name}
            </button>
            <Button onClick={() => rename(p)}>Rename</Button>
            <Button onClick={() => downloadPatch(p)}>Export</Button>
            <Button
              onClick={() => {
                deletePatch(p.id);
                refresh();
                note(`Deleted ${p.name}`);
              }}
            >
              Delete
            </Button>
          </li>
        ))}
        {list.length === 0 && <li className="patch-empty">No saved patches yet.</li>}
      </ul>
      <p className="patch-feedback" aria-live="polite">
        {feedback}
      </p>
    </ModalDialog>
  );
}
