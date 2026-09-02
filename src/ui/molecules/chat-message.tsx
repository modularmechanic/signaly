import type { ReactNode } from 'react';
import { Button } from '../atoms/button';

export type ChatRole = 'user' | 'assistant' | 'error';

export interface ChatMessageProps {
  role: ChatRole;
  text: string;
  onRetry?: () => void;
}

/** Model and user text is always a text node — never HTML. */
export function ChatMessage({ role, text, onRetry }: ChatMessageProps): ReactNode {
  return (
    <li className={`chat-msg ${role}`}>
      <span className="chat-role">{role}</span>
      <p className="chat-text">{text}</p>
      {onRetry ? <Button onClick={onRetry}>Retry with this error</Button> : null}
    </li>
  );
}
