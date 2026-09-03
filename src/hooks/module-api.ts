import { useCallback, useEffect, useRef, useState } from 'react';
import { setParam, setSwitch } from '../engine/rack';
import type { ModuleInstance } from '../engine/types';
import { useRackStore } from '../state/rack-store';
import { addDraw } from './render-bus';

/** Local state mirroring an external value, resynced when that value changes for a reason
    other than our own last write (preset load, another control on the same id, duplicate).
    `setValue` updates the mirror BEFORE committing, so a ~120 Hz drag never fights its own
    store round-trip. */
export function useSyncedValue<T>(external: T, commit: (v: T) => void): [T, (v: T) => void] {
  const [local, setLocal] = useState(external);
  const lastExternal = useRef(external);
  if (external !== lastExternal.current) {
    lastExternal.current = external;
    setLocal(external);
  }
  const setValue = useCallback(
    (v: T) => {
      lastExternal.current = v;
      setLocal(v);
      commit(v);
    },
    [commit],
  );
  return [local, setValue];
}

/** `[value, setValue]` for a knob param. Instances are identity-stable and the store mutates
    `vals` in place, so reading `m.vals[id]` under a store subscription is O(1) and current. */
export function useParam(m: ModuleInstance, id: string): [number, (v: number) => void] {
  const external = useRackStore(() => m.vals[id] ?? 0);
  const commit = useCallback((v: number) => setParam(m.uid, id, v), [m.uid, id]);
  return useSyncedValue(external, commit);
}

/** `[index, setIndex]` for a switch — same contract as useParam. */
export function useSwitch(m: ModuleInstance, id: string): [number, (i: number) => void] {
  const external = useRackStore(() => m.sws[id] ?? 0);
  const commit = useCallback((i: number) => setSwitch(m.uid, id, i), [m.uid, id]);
  return useSyncedValue(external, commit);
}

/** Run `fn` every frame on the shared render bus. */
export function useRenderFrame(fn: () => void): void {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => addDraw(() => fnRef.current()), []);
}

/** Multi-subscriber worklet feed: one shared dispatcher per node fans out to a Set on m.ext. */
export function useWorkletFeed<M = unknown>(m: ModuleInstance, handler: (msg: M) => void): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const node = m.node;
    if (!node) return;
    const bag = m.ext as { __feed?: Set<(msg: unknown) => void> };
    if (!bag.__feed) {
      bag.__feed = new Set();
      node.port.onmessage = (e: MessageEvent): void => bag.__feed?.forEach((h) => h(e.data));
    }
    const h = (msg: unknown): void => ref.current(msg as M);
    bag.__feed.add(h);
    return () => {
      bag.__feed?.delete(h);
    };
  }, [m]);
}

/** A stable poster to `m.node.port` — a no-op for native modules. */
export function usePortSend<M = unknown>(m: ModuleInstance): (msg: M) => void {
  const node = m.node;
  return useCallback((msg: M) => node?.port.postMessage(msg), [node]);
}
