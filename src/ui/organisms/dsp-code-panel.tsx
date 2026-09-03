import { useMemo, useState, type ReactNode } from 'react';
import { bindProcessorName, transpileDsp } from '../../features/user-modules/dsp-transpile';
import { verifyDsp } from '../../features/user-modules/dsp-verify';
import { processorNameFor, toRecord, type UserModule } from '../../features/user-modules/schema';
import { validateUserDef } from '../../features/user-modules/validate';
import { useUiStore } from '../../state/ui-store';
import { saveUserModule } from '../../storage/user-module-store';
import { Button } from '../atoms/button';
import { CodeEditor } from '../molecules/code-editor';

export interface DspCodePanelProps {
  um: UserModule;
  /** registers the edited module and previews it; resolves to an error string or null */
  onRegister: (um: UserModule) => Promise<string | null>;
}

export function DspCodePanel({ um, onRegister }: DspCodePanelProps): ReactNode {
  const [src, setSrc] = useState(um.dsp);
  const [tabs, setTabs] = useState(false);
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const setNotice = useUiStore((s) => s.setNotice);
  const defOk = useMemo(() => validateUserDef(um.def).ok, [um.def]);

  const verify = async (): Promise<void> => {
    setBusy(true);
    setOk(false);
    try {
      const name = processorNameFor(um);
      const built = transpileDsp(bindProcessorName(src, name), name);
      if (!built.ok) {
        setMsg(built.error);
        return;
      }
      const failure = await verifyDsp(built.code, name, um.def.outs.length);
      setMsg(failure ?? 'Verified: no NaN, no out-of-range samples.');
      setOk(failure === null);
    } finally {
      setBusy(false);
    }
  };

  const save = async (): Promise<void> => {
    setBusy(true);
    try {
      // updatedAt drives the processor name: a live context can never reuse an old one.
      const next: UserModule = { ...um, dsp: src, updatedAt: Date.now() };
      const err = await onRegister(next);
      if (err) {
        setMsg(err);
        setOk(false);
        return;
      }
      saveUserModule(toRecord(next));
      setMsg(`Saved ${next.slug}.`);
      setNotice(`Saved ${next.slug}.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'unexpected error');
      setOk(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="builder-card">
      <h2>DSP source</h2>
      <CodeEditor
        value={src}
        onChange={(v) => {
          setSrc(v);
          setOk(false);
        }}
        label="Module DSP source"
        insertTabs={tabs}
        onInsertTabs={setTabs}
      />
      <div className="editor-bar">
        <Button disabled={busy} onClick={() => void verify()}>
          Verify
        </Button>
        <Button disabled={busy || !ok || !defOk} onClick={() => void save()}>
          Save
        </Button>
        {defOk ? null : <span className="editor-msg error">The module definition is invalid.</span>}
      </div>
      <p className={`editor-msg${ok ? '' : ' error'}`} aria-live="polite">
        {msg}
      </p>
    </section>
  );
}
