import { useId, useRef, type KeyboardEvent, type ReactNode, type UIEvent } from 'react';

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  /** when false (the default) Tab moves focus instead of inserting a tab */
  insertTabs: boolean;
  onInsertTabs: (on: boolean) => void;
}

/** Textarea plus a line-number gutter. No highlighting, no autocomplete, on purpose. */
export function CodeEditor({ value, onChange, label, insertTabs, onInsertTabs }: CodeEditorProps): ReactNode {
  const id = useId();
  const tabId = useId();
  const gutter = useRef<HTMLPreElement>(null);
  const lines = value.split('\n').length;
  const numbers = Array.from({ length: lines }, (_, i) => String(i + 1)).join('\n');

  const onScroll = (e: UIEvent<HTMLTextAreaElement>): void => {
    if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key !== 'Tab' || !insertTabs) return;
    e.preventDefault();
    const el = e.currentTarget;
    const { selectionStart: a, selectionEnd: b } = el;
    onChange(`${value.slice(0, a)}\t${value.slice(b)}`);
    requestAnimationFrame(() => el.setSelectionRange(a + 1, a + 1));
  };

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <div className="code-editor">
        <pre className="gutter" ref={gutter} aria-hidden="true">
          {numbers}
        </pre>
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={onScroll}
          onKeyDown={onKeyDown}
          spellCheck={false}
          wrap="off"
          autoComplete="off"
        />
      </div>
      <label htmlFor={tabId}>
        <input
          id={tabId}
          type="checkbox"
          checked={insertTabs}
          onChange={(e) => onInsertTabs(e.target.checked)}
        />{' '}
        Insert tabs (Tab stops moving focus)
      </label>
    </div>
  );
}
