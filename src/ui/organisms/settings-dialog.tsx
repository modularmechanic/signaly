import { useEffect, useState, type ReactNode } from 'react';
import { activeProvider, setActiveProvider } from '../../features/llm/active-provider';
import { MAX_ROW_HP, MIN_ROW_HP, useSettingsStore } from '../../state/settings-store';
import {
  clearKeys,
  getKeys,
  getModel,
  PROVIDERS,
  setKey,
  setModel,
  setRememberKeys,
  type Provider,
} from '../../storage/api-key-store';
import { clearImages } from '../../storage/image-store';
import { Button } from '../atoms/button';
import { Select } from '../atoms/select';

const mb = (n = 0): string => `${(n / 1_000_000).toFixed(1)} MB`;

/** One BYOK row. The key is write-only here: it is never rendered back or logged. */
function ProviderRow({ p, onChanged }: { p: Provider; onChanged: () => void }): ReactNode {
  const [draft, setDraft] = useState('');
  const [models, setModels] = useState<readonly string[]>([]);
  const [error, setError] = useState('');
  const stored = getKeys()[p] !== undefined;
  const current = getModel(p) ?? '';

  const load = async (): Promise<void> => {
    // Dynamic: the provider clients belong to the builder chunk, not the rack.
    const { listModels } = await import('../../features/llm/client');
    const r = await listModels(p);
    if (Array.isArray(r)) {
      setModels(r);
      setError('');
    } else setError(r.error);
  };

  return (
    <div className="settings-provider">
      <label className="settings-key">
        <span>{p} API key</span>
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={draft}
          placeholder={stored ? 'saved — type to replace' : 'not set'}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft === '') return;
            setKey(p, draft);
            setDraft('');
            onChanged();
            void load();
          }}
        />
      </label>
      <Button onClick={() => void load()} disabled={!stored}>
        Models
      </Button>
      {stored && (
        <Button
          onClick={() => {
            setKey(p, '');
            onChanged();
          }}
        >
          Remove key
        </Button>
      )}
      <Select
        label={`${p} model`}
        value={current}
        options={models.length > 0 ? models : current ? [current] : ['—']}
        onChange={(id) => {
          setModel(p, id);
          onChanged();
        }}
      />
      {error !== '' && <p className="settings-error">{error}</p>}
    </div>
  );
}

export function SettingsDialog({ onClose }: { onClose: () => void }): ReactNode {
  const [rev, bump] = useState(0);
  const [storage, setStorage] = useState('');
  const [confirming, setConfirming] = useState(false);
  const rowWidthHp = useSettingsStore((s) => s.rowWidthHp);
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const rememberKeys = useSettingsStore((s) => s.rememberKeys);
  const onChanged = (): void => bump((n) => n + 1);

  useEffect(() => {
    void navigator.storage?.estimate?.().then((e) => setStorage(`${mb(e.usage)} of ${mb(e.quota)}`));
  }, [rev]);

  const withKeys = PROVIDERS.filter((p) => getKeys()[p] !== undefined);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal settings" role="dialog" aria-modal="true" aria-label="Settings">
        <header className="modal-head">
          <h2>Settings</h2>
          <button type="button" className="modal-x" aria-label="Close settings" onClick={onClose}>
            ×
          </button>
        </header>

        <section className="settings-block">
          <h3>API keys</h3>
          <p className="settings-hint">
            Keys stay in this browser and are sent only to their provider. They are kept for this tab session
            unless you choose to remember them.
          </p>
          <label className="settings-field">
            <span>Remember keys in this browser</span>
            <input
              type="checkbox"
              checked={rememberKeys}
              onChange={(e) => {
                setRememberKeys(e.target.checked);
                onChanged();
              }}
            />
          </label>
          {PROVIDERS.map((p) => (
            <ProviderRow key={p} p={p} onChanged={onChanged} />
          ))}
          {withKeys.length > 0 && (
            <Select
              label="Active provider"
              value={activeProvider() ?? withKeys[0] ?? ''}
              options={withKeys}
              onChange={(id) => {
                setActiveProvider(id as Provider);
                onChanged();
              }}
            />
          )}
        </section>

        <section className="settings-block">
          <h3>Rack</h3>
          <label className="settings-field">
            <span>Row width (HP)</span>
            <input
              type="number"
              min={MIN_ROW_HP}
              max={MAX_ROW_HP}
              step={2}
              value={rowWidthHp}
              onChange={(e) => useSettingsStore.getState().setRowWidthHp(e.target.valueAsNumber)}
            />
          </label>
          <label className="settings-field">
            <span>Reduce motion</span>
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => useSettingsStore.getState().setReducedMotion(e.target.checked)}
            />
          </label>
        </section>

        <section className="settings-block">
          <h3>Data</h3>
          <p className="settings-hint">Storage used: {storage || 'unknown'}</p>
          {confirming ? (
            <>
              <Button
                onClick={() => {
                  clearKeys();
                  try {
                    localStorage.clear();
                  } catch {
                    /* storage disabled */
                  }
                  // Faceplate blobs live in IndexedDB; without this they outlive "permanently".
                  void clearImages()
                    .catch(() => undefined)
                    .finally(() => window.location.reload());
                }}
              >
                Delete everything, permanently
              </Button>
              <Button onClick={() => setConfirming(false)}>Cancel</Button>
            </>
          ) : (
            <Button onClick={() => setConfirming(true)}>Clear all data…</Button>
          )}
        </section>
      </div>
    </div>
  );
}
