import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { applySnapshot } from '../../engine/snapshot';
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
import { Button } from '../atoms/button';

export function PatchMenu({ onClose }: { onClose: () => void }): ReactNode {
  const [list, setList] = useState<Patch[]>(() => listPatches());
  const [name, setName] = useState('');
  // Own line, not the rack's global notice — that one still holds "Added VCO" from before.
  const [feedback, note] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = (): void => setList(listPatches());

  const save = (): void => {
    const saved = savePatch(name);
    setName('');
    refresh();
    note(`Saved ${saved.name}`);
  };

  const load = (p: Patch): void => {
    applySnapshot(p.snapshot);
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
      applySnapshot(patch.snapshot);
      savePatch(patch.name, patch.snapshot);
      refresh();
      note(`Imported ${patch.name}`);
    } catch (err) {
      note(err instanceof Error ? err.message : 'Could not import that file.');
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal patches" role="dialog" aria-modal="true" aria-label="Patches">
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
      </div>
    </div>
  );
}
