import { Component, type ErrorInfo, type ReactNode } from 'react';

const MAX_MESSAGE = 300;

interface Props {
  children: ReactNode;
}

interface State {
  message: string | null;
}

/**
 * Last resort for a render exception: without it React unmounts the tree and leaves a blank page
 * with no way back. Only the error message is shown — never storage contents or a request body.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { message: null };

  static getDerivedStateFromError(e: unknown): State {
    return { message: (e instanceof Error ? e.message : 'unexpected error').slice(0, MAX_MESSAGE) };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Developers keep the full stack; the user gets the line above.
    console.error(error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.message === null) return this.props.children;
    return (
      <div className="app-crash" role="alert">
        <h1>Signaly hit an error</h1>
        <p>{this.state.message}</p>
        <button type="button" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    );
  }
}
