import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import { errorMessage } from './features/llm/providers/http';
import { FADER_PAD_PX, FADER_W_PX, HP_PX, JACK_D_PX, PANEL_H } from './modules/panel-layout';
import { useUiStore } from './state/ui-store';
import { ErrorBoundary } from './ui/atoms/error-boundary';

const MAX_NOTICE = 300;

/** A rejection nobody handled is otherwise invisible outside devtools. Console stays untouched. */
const notice = (e: unknown): void => useUiStore.getState().setNotice(errorMessage(e).slice(0, MAX_NOTICE));

window.addEventListener('error', (e) => notice(e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => notice(e.reason));

// panel-layout owns the panel's pixel geometry; the stylesheets read it from here rather than
// restating it, so there is one number per dimension instead of a comment asking two to agree.
// --u is the rack's unit: one HP is 26u and every hardware dimension in panel/controls/cables
// is a multiple of it. --hp is set once and never changes at runtime: the rack zooms with CSS
// `zoom` (use-rack-zoom), so a second lever here would scale the art twice.
const root = document.documentElement.style;
root.setProperty('--hp', `${HP_PX}px`);
root.setProperty('--u', `calc(var(--hp) / ${HP_PX})`);
root.setProperty('--panel-h', `calc(${PANEL_H} * var(--u))`);
root.setProperty('--jack-d', `calc(${JACK_D_PX} * var(--u))`);
root.setProperty('--fader-w', `calc(${FADER_W_PX} * var(--u))`);
root.setProperty('--fader-pad', `calc(${FADER_PAD_PX} * var(--u))`);

const host = document.getElementById('root');
if (host)
  createRoot(host).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
