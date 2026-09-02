import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import './styles/tokens.css';
import './styles/base.css';
import './styles/panel.css';
import './styles/controls.css';
import './styles/cables.css';
import './styles/rack.css';
import { useSettingsStore } from './state/settings-store';
import { useUiStore } from './state/ui-store';
import { RackPage } from './ui/pages/rack-page';

// The builder pulls in sucrase and the LLM client; the rack view never needs them.
const BuilderPage = lazy(() => import('./ui/pages/builder-page'));

export function App(): ReactNode {
  const view = useUiStore((s) => s.view);
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);

  useEffect(() => {
    document.body.classList.toggle('reduced-motion', reducedMotion);
  }, [reducedMotion]);

  if (view === 'builder') {
    return (
      <Suspense fallback={<p className="app-loading">Loading builder…</p>}>
        <BuilderPage />
      </Suspense>
    );
  }
  return <RackPage />;
}
