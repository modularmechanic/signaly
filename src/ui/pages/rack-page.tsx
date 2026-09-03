import { useEffect, useState, type ReactNode } from 'react';
import { isWorkletReady, loadWorklet } from '../../engine/audio-context';
import { addModule } from '../../engine/rack';
import { useRackStore } from '../../state/rack-store';
import { useUiStore } from '../../state/ui-store';
import { RackWorkspace } from '../templates/rack-workspace';

export function RackPage(): ReactNode {
  // Every worklet module throws InvalidStateError until the DSP bundle is registered,
  // so the rack cannot be built (or shown) before it loads.
  const [pending, setPending] = useState(!isWorkletReady());

  useEffect(() => {
    let live = true;
    void loadWorklet()
      .then(() => {
        if (!live) return;
        setPending(false);
        // A blank rack has nothing to look at or hear: seed a voice and the output.
        if (Object.keys(useRackStore.getState().modules).length > 0) return;
        addModule('vco', 0);
        addModule('out', 0);
      })
      .catch(() => {
        if (!live) return;
        setPending(false);
        useUiStore.getState().setNotice('Audio engine failed to load — reload the page.');
      });
    return () => {
      live = false;
    };
  }, []);

  if (pending) return <p className="app-loading">Loading audio engine…</p>;
  return <RackWorkspace />;
}
