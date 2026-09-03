import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './error-boundary';

let host: HTMLDivElement;
let root: Root;

const Boom = ({ message }: { message: string }): ReactNode => {
  throw new Error(message);
};

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  // React logs the caught error itself; the boundary's own console.error is asserted separately.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renders children while nothing throws', () => {
    act(() => root.render(<ErrorBoundary>{<p>rack</p>}</ErrorBoundary>));
    expect(host.textContent).toBe('rack');
  });

  it('replaces a crashed tree with a recoverable alert instead of a blank page', () => {
    act(() =>
      root.render(
        <ErrorBoundary>
          <Boom message="oscillator exploded" />
        </ErrorBoundary>,
      ),
    );
    const alert = host.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('oscillator exploded');
    expect(host.querySelector('button')?.textContent).toBe('Reload');
  });

  it('caps a runaway message', () => {
    act(() =>
      root.render(
        <ErrorBoundary>
          <Boom message={'x'.repeat(1000)} />
        </ErrorBoundary>,
      ),
    );
    expect(host.querySelector('[role="alert"] p')?.textContent).toHaveLength(300);
  });
});
