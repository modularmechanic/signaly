import { useState, type ReactNode } from 'react';
import { generateModule, type ChatTurn } from '../../features/llm/client';
import type { UserModule } from '../../features/user-modules/schema';
import { validateUserDef } from '../../features/user-modules/validate';
import { Button } from '../atoms/button';
import { ChatMessage, type ChatRole } from '../molecules/chat-message';

interface Msg {
  role: ChatRole;
  text: string;
  /** the prompt to re-send when the user clicks "retry with this error" */
  retry?: string;
}

export interface ModuleBuilderChatProps {
  /** registers the proposal and previews it; resolves to an error string or null */
  onModule: (um: UserModule) => Promise<string | null>;
}

export function ModuleBuilderChat({ onModule }: ModuleBuilderChatProps): ReactNode {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [prompt, setPrompt] = useState('');
  const [pending, setPending] = useState(false);

  const send = async (text: string): Promise<void> => {
    const ask = text.trim();
    if (!ask || pending) return;
    const history: ChatTurn[] = msgs
      .filter((m) => m.role !== 'error')
      .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', text: m.text }));
    const add = (m: Msg): void => setMsgs((l) => [...l, m]);
    const fail = (error: string): void =>
      add({ role: 'error', text: error, retry: `${ask}\n\nThe previous attempt failed: ${error}` });

    add({ role: 'user', text: ask });
    setPending(true);
    try {
      const res = await generateModule(ask, history);
      if ('error' in res) return fail(res.error);
      if (res.note) add({ role: 'assistant', text: res.note });
      const v = validateUserDef(res.def);
      if (!v.ok) return fail(v.error);
      const now = Date.now();
      // registering reaches addModule, which throws when a worklet processor never registered
      const err = await onModule({
        slug: res.slug,
        def: v.def,
        dsp: res.dsp,
        createdAt: now,
        updatedAt: now,
      }).catch((e: unknown) => (e instanceof Error ? e.message : 'unexpected error'));
      if (err) return fail(err);
      add({ role: 'assistant', text: `Built ${res.slug}. Edit the DSP, verify it, then save.` });
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="builder-card">
      <h2>Describe a module</h2>
      <ul className="chat-log">
        {msgs.map((m, i) => (
          <ChatMessage
            key={i}
            role={m.role}
            text={m.text}
            onRetry={m.retry === undefined ? undefined : () => void send(m.retry ?? '')}
          />
        ))}
      </ul>
      <p className="builder-note" aria-live="polite">
        {pending ? 'Generating…' : ''}
      </p>
      <div className="chat-form">
        <label htmlFor="builder-prompt">Prompt</label>
        <textarea
          id="builder-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="A 6 HP wavefolder with drive and symmetry"
        />
        <div>
          <Button
            disabled={pending || !prompt.trim()}
            onClick={() => {
              const ask = prompt;
              setPrompt('');
              void send(ask);
            }}
          >
            Send
          </Button>
        </div>
      </div>
    </section>
  );
}
