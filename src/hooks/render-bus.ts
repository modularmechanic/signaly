// Registry + the single rAF pump for everything drawn outside React (scopes,
// VU meters, cables). Started lazily on the first subscriber; stopped when the
// last one leaves, so an idle rack burns no frames.
type DrawFn = () => void;
type CpuFn = (pct: number) => void;

const draws = new Set<DrawFn>();
const cpuListeners = new Set<CpuFn>();
let frame = 0;

function pump(): void {
  frame = requestAnimationFrame(pump);
  runDraws();
}

function sync(): void {
  if (draws.size > 0 && frame === 0) frame = requestAnimationFrame(pump);
  else if (draws.size === 0 && frame !== 0) {
    cancelAnimationFrame(frame);
    frame = 0;
  }
}

/** Register a per-frame draw callback. Returns an unsubscribe. */
export function addDraw(fn: DrawFn): () => void {
  draws.add(fn);
  sync();
  return () => {
    draws.delete(fn);
    sync();
  };
}

export function runDraws(): void {
  for (const fn of draws) fn();
}

/** Subscribe to the render-load meter (0..100). Returns an unsubscribe. */
export function onCpu(fn: CpuFn): () => void {
  cpuListeners.add(fn);
  return () => {
    cpuListeners.delete(fn);
  };
}

export function emitCpu(pct: number): void {
  for (const fn of cpuListeners) fn(pct);
}
