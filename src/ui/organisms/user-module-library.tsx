import { useState, type ReactNode } from 'react';
import { unregisterUserModule } from '../../features/user-modules/runtime-registry';
import { fromRecord, type UserModule } from '../../features/user-modules/schema';
import { removeImage } from '../../storage/image-store';
import { listUserModules, removeUserModule, type UserModuleRecord } from '../../storage/user-module-store';
import { Button } from '../atoms/button';

const MAX_IMPORT_BYTES = 1024 * 1024;

export interface UserModuleLibraryProps {
  /** loads a module into the builder (which registers and previews it) */
  onLoad: (um: UserModule) => void;
}

function download(um: UserModule): void {
  const text = JSON.stringify({ format: 'signaly.module', version: 1, module: um }, null, 2);
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${um.slug}.signaly-module.json`;
  a.click();
  // Firefox cancels an in-flight download if the object URL dies in the same task.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** An imported file is exactly as untrusted as an LLM proposal: shape, then full validation. */
async function readImport(file: File): Promise<UserModule | { error: string }> {
  if (file.size > MAX_IMPORT_BYTES) return { error: 'That file is larger than 1 MB.' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text()) as unknown;
  } catch {
    return { error: 'That file is not valid JSON.' };
  }
  const env = parsed as { format?: unknown; version?: unknown; module?: unknown };
  if (env.format !== 'signaly.module' || env.version !== 1) {
    return { error: 'That file is not a signaly module export.' };
  }
  if (typeof env.module !== 'object' || env.module === null) return { error: 'The module is missing.' };
  const m = env.module as Record<string, unknown>;
  const now = Date.now();
  return fromRecord({
    slug: typeof m.slug === 'string' ? m.slug : '',
    def: m.def,
    dsp: typeof m.dsp === 'string' ? m.dsp : '',
    createdAt: typeof m.createdAt === 'number' ? m.createdAt : now,
    updatedAt: now,
  });
}

export function UserModuleLibrary({ onLoad }: UserModuleLibraryProps): ReactNode {
  const [, bump] = useState(0);
  const [msg, setMsg] = useState('');
  const rows = listUserModules().map((rec) => {
    const parsed = fromRecord(rec);
    return {
      rec,
      um: 'error' in parsed ? null : parsed,
      error: 'error' in parsed ? parsed.error : '',
    };
  });

  const remove = (rec: UserModuleRecord): void => {
    removeUserModule(rec.slug);
    unregisterUserModule(rec.slug);
    if (rec.faceplateImageId) void removeImage(rec.faceplateImageId);
    bump((n) => n + 1);
  };

  const load = async (file: File): Promise<void> => {
    const um = await readImport(file);
    if ('error' in um) {
      setMsg(um.error);
      return;
    }
    setMsg('');
    onLoad(um);
  };

  return (
    <section className="builder-card">
      <h2>Your modules</h2>
      <ul className="lib-list">
        {rows.map(({ rec, um, error }) => (
          <li key={rec.slug} className="lib-row">
            <span className="lib-name">
              {um ? um.def.name : error} <span className="lib-slug">{rec.slug}</span>
            </span>
            <Button
              disabled={!um}
              onClick={() => {
                if (um) onLoad(um);
              }}
            >
              Load
            </Button>
            <Button
              disabled={!um}
              onClick={() => {
                if (um) download(um);
              }}
            >
              Export
            </Button>
            <Button onClick={() => remove(rec)}>Delete</Button>
          </li>
        ))}
      </ul>
      <div className="fp-row">
        <label htmlFor="lib-import">Import JSON</label>
        <input
          id="lib-import"
          type="file"
          accept="application/json,.json"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void load(file);
          }}
        />
      </div>
      <p className="editor-msg error" aria-live="polite">
        {msg}
      </p>
    </section>
  );
}
