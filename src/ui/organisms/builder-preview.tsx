import { lazy, Suspense, type ReactNode } from 'react';
import type { ModuleInstance } from '../../engine/types';

// Phase 06 owns the panel; the builder must not pull it into the rack chunk.
const ModulePanel = lazy(() => import('./module-panel').then((m) => ({ default: m.ModulePanel })));

/** The throwaway preview row's single module. The workspace owns its lifetime. */
export function BuilderPreview({ inst }: { inst: ModuleInstance | null }): ReactNode {
  return (
    <section className="builder-card">
      <h2>Preview</h2>
      {inst ? (
        <Suspense fallback={<p className="builder-note">Loading the panel…</p>}>
          <ModulePanel m={inst} />
        </Suspense>
      ) : (
        <p className="builder-note">Generate or load a module to preview it here.</p>
      )}
    </section>
  );
}
