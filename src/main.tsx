import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import { errorMessage } from './features/llm/providers/http';
import { useUiStore } from './state/ui-store';
import { ErrorBoundary } from './ui/atoms/error-boundary';

const MAX_NOTICE = 300;

/** A rejection nobody handled is otherwise invisible outside devtools. Console stays untouched. */
const notice = (e: unknown): void => useUiStore.getState().setNotice(errorMessage(e).slice(0, MAX_NOTICE));

window.addEventListener('error', (e) => notice(e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => notice(e.reason));

const host = document.getElementById('root');
if (host)
  createRoot(host).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
