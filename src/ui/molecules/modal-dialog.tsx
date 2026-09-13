import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Re-queried on every Tab rather than cached at open: the browser filters its list and the patch
// list grows and shrinks while the dialog is up, so a cached ring would wrap around stale nodes.
const focusable = (root: HTMLElement): HTMLElement[] => [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];

export interface ModalDialogProps {
  label: string;
  onClose: () => void;
  children: ReactNode;
}

/** Modal chrome: backdrop, backdrop dismiss, Escape, focus trap, focus restore. */
export function ModalDialog({ label, onClose, children }: ModalDialogProps): ReactNode {
  const box = useRef<HTMLDivElement>(null);
  // Captured during render, not in the effect: by the time effects run, a commit-time autoFocus
  // inside the dialog would already have replaced document.activeElement.
  const [opener] = useState(() => document.activeElement);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (!el.contains(document.activeElement)) (focusable(el)[0] ?? el).focus();
    return () => {
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [opener]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Escape') return onClose();
    const el = box.current;
    if (e.key !== 'Tab' || !el) return;
    const items = focusable(el);
    const first = items[0];
    const last = items[items.length - 1];
    // Nothing to cycle through — hold focus here rather than let Tab walk into the rack behind.
    if (!first || !last) return e.preventDefault();
    const at = document.activeElement;
    const atEdge = e.shiftKey ? at === first || at === el : at === last;
    if (!atEdge) return;
    e.preventDefault();
    (e.shiftKey ? last : first).focus();
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={box}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        {children}
      </div>
    </div>
  );
}
