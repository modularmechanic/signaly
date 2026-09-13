import { useMemo, useState, type ReactNode } from 'react';
import { check } from '../../features/user-modules/lifecycle';
import type { UserModule } from '../../features/user-modules/schema';
import { validateUserDef } from '../../features/user-modules/validate';
import { useUiStore } from '../../state/ui-store';
import { Button } from '../atoms/button';
import { CodeEditor } from '../molecules/code-editor';

export interface DspCodePanelProps {
  um: UserModule;
  /** installs the edited module and previews it; resolves to an error string or null */
  onSave: (um: UserModule) => Promise<string | null>;
}

export function DspCodePanel({ um, onSave }: DspCodePanelProps): ReactNode {
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
      const failure = await check({ ...um, dsp: src });
      setMsg(failure ?? 'Verified: no NaN, no out-of-range samples.');
      setOk(failure === null);
    } finally {
      setBusy(false);
    }
  };

  const save = async (): Promise<void> => {
    setBusy(true);
    try {
      const err = await onSave({ ...um, dsp: src });
      if (err) {
        setMsg(err);
        setOk(false);
        return;
      }
      setMsg(`Saved ${um.slug}.`);
      setNotice(`Saved ${um.slug}.`);
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
