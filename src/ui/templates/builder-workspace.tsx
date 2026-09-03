import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { addModule, addRow, removeModule, removeRow } from '../../engine/rack';
import type { ModuleInstance } from '../../engine/types';
import { registerUserModule } from '../../features/user-modules/runtime-registry';
import type { UserModule } from '../../features/user-modules/schema';
import { useRackStore } from '../../state/rack-store';
import { useUiStore } from '../../state/ui-store';
import { Button } from '../atoms/button';
import { BuilderPreview } from '../organisms/builder-preview';
import { DspCodePanel } from '../organisms/dsp-code-panel';
import { FaceplateEditor } from '../organisms/faceplate-editor';
import { ModuleBuilderChat } from '../organisms/module-builder-chat';
import { UserModuleLibrary } from '../organisms/user-module-library';
import '../../styles/builder.css';

interface Preview {
  inst: ModuleInstance;
  rowId: string;
}

export function BuilderWorkspace(): ReactNode {
  const [draft, setDraft] = useState<UserModule | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const setView = useUiStore((s) => s.setView);
  const alive = useRef(true);

  // register() awaits a verify that can outlive the page; without this the continuation
  // would add a row and a module nobody can see, let alone remove.
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // Unconditional teardown: replacing or leaving the builder always clears the throwaway row.
  useEffect(() => {
    if (!preview) return;
    return () => {
      removeModule(preview.inst.uid);
      removeRow(preview.rowId);
    };
  }, [preview]);

  // The single registration path: transpile + verify + load live, then preview.
  const register = useCallback(async (um: UserModule): Promise<string | null> => {
    setDraft(um);
    const r = await registerUserModule(um);
    if (!alive.current) return null;
    if (!r.ok) {
      setPreview(null);
      return r.error;
    }
    const rowId = addRow();
    const rows = useRackStore.getState().rows;
    const inst = addModule(
      r.id,
      rows.findIndex((row) => row.id === rowId),
    );
    if (!inst) {
      removeRow(rowId);
      setPreview(null);
      return 'the preview row could not hold the module';
    }
    setPreview({ inst, rowId });
    return null;
  }, []);

  return (
    <div className="builder">
      <div className="builder-bar">
        <Button onClick={() => setView('rack')}>Back to rack</Button>
        <h1>Module builder</h1>
      </div>
      <div className="builder-col">
        <ModuleBuilderChat onModule={register} />
        <UserModuleLibrary onLoad={(um) => void register(um)} />
      </div>
      <div className="builder-col">
        {draft ? (
          <DspCodePanel key={draft.slug} um={draft} onRegister={register} />
        ) : (
          <section className="builder-card">
            <h2>DSP source</h2>
            <p className="builder-note">Describe a module in the chat, or load one from your library.</p>
          </section>
        )}
        <BuilderPreview inst={preview?.inst ?? null} />
        {draft ? <FaceplateEditor um={draft} onChange={setDraft} /> : null}
      </div>
    </div>
  );
}
