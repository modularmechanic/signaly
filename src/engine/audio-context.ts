// `?worker&url` makes Vite bundle worklet-entry.ts as its own chunk (TS
// transformed, the .dsp.ts glob expanded) and hand back a plain URL.
// `new URL('./worklet-entry.ts', import.meta.url)` is BROKEN under a Vite
// build: the raw .ts ships as a video/mp2t asset and the glob never expands.
import workletUrl from './worklet-entry.ts?worker&url';

let ac: AudioContext | null = null;
let workletReady = false;
let workletLoading: Promise<void> | null = null;

/** The shared AudioContext, created on first access. */
export function getAudioContext(): AudioContext {
  if (!ac) {
    ac = new AudioContext({ latencyHint: 'interactive' });
    attachGestureResume(ac);
  }
  return ac;
}

/** Load the worklet bundle once; concurrent and repeat calls share one promise. */
export function loadWorklet(): Promise<void> {
  const context = getAudioContext();
  if (workletReady) return Promise.resolve();
  if (!workletLoading) {
    workletLoading = context.audioWorklet
      .addModule(workletUrl)
      .then(() => {
        workletReady = true;
      })
      .catch((error: unknown) => {
        // A transient fetch/compile failure must not poison the session.
        workletLoading = null;
        throw error;
      });
  }
  return workletLoading;
}

export function isWorkletReady(): boolean {
  return workletReady;
}

export function isRunning(): boolean {
  return ac?.state === 'running';
}

/** Resume the context (safe any time; no-op once running). */
export function resume(): void {
  void ac?.resume().catch(() => {
    /* autoplay policy — retried on the next gesture */
  });
}

function attachGestureResume(context: AudioContext): void {
  const detach = (): void => {
    window.removeEventListener('pointerdown', onGesture);
    window.removeEventListener('keydown', onGesture);
  };
  const onGesture = (): void => {
    void context
      .resume()
      .then(() => {
        if (context.state === 'running') detach();
      })
      .catch(() => {
        /* ignore; a later gesture retries */
      });
  };
  window.addEventListener('pointerdown', onGesture, { passive: true });
  window.addEventListener('keydown', onGesture, { passive: true });
}
