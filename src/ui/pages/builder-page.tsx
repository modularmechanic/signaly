import type { ReactNode } from 'react';
import { useUiStore } from '../../state/ui-store';
import { hasAnyKey } from '../../storage/api-key-store';
import { Button } from '../atoms/button';
import { BuilderWorkspace } from '../templates/builder-workspace';

/** Re-checked here so a deep link cannot reach the chat without a key. */
export default function BuilderPage(): ReactNode {
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const setView = useUiStore((s) => s.setView);
  if (hasAnyKey()) return <BuilderWorkspace />;
  return (
    <div className="builder-gate">
      <h1>Module builder</h1>
      <p>
        The builder describes a module to a language model with your own API key. Add a key for Anthropic,
        OpenAI or Gemini in Settings to start; nothing is sent anywhere until you do.
      </p>
      <Button
        onClick={() => {
          setSettingsOpen(true);
          setView('rack');
        }}
      >
        Open settings
      </Button>
    </div>
  );
}
