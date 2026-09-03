import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { setParam, setSwitch } from '../engine/rack';
import type { JackRef, ModuleInstance } from '../engine/types';
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

/** ±5 V is full scale, and a knob's CV marker spans the full travel at attenuverter 1. */
const CV_VOLTS = 5;
/** ~30 Hz. Faster buys nothing on a marker with a 50 ms CSS ease and costs rAF budget. */
const CV_MS = 33;
/** Travel step below one pixel on the dial, so an idle patch writes no style at all. */
const CV_STEP = 500;

/** Where a knob's CV comes from: the attenuverter gain when one exists (so the reading is
    post-attenuverter, matching what the DSP sees), else the patched source's own out jack. */
function cvTap(m: ModuleInstance, jackId: string, src: string): JackRef | undefined {
  const gain = m.cvGains?.[jackId]?.node;
  if (gain) return { node: gain, idx: 0 };
  const [uid, jack] = src.split(':');
  return useRackStore.getState().modules[Number(uid)]?.jacks.out[jack ?? ''];
}

/** Drives the live CV marker on a knob: writes the modulated 0..1 position straight to
    `--cv` on `ref` off the render bus, never through React state. Returns whether a cable
    is feeding `jackId` — while false the caller owns `--cv` and the static marker stands.
    Costs nothing for a knob with no `cvIn` or an unpatched one: no tap, no subscription. */
export function useCvMod(
  m: ModuleInstance,
  jackId: string | undefined,
  ref: RefObject<HTMLElement | null>,
  pct: number,
): boolean {
  const pctRef = useRef(pct);
  pctRef.current = pct;
  // A primitive key, so re-patching to a different source restarts the tap while an
  // unrelated rack change re-renders nothing.
  const src = useRackStore((s) => {
    if (jackId === undefined) return '';
    const c = s.cables.find((x) => x.to.uid === m.uid && x.to.jack === jackId);
    return c ? `${c.from.uid}:${c.from.jack}` : '';
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || jackId === undefined || !src) return;
    const tap = cvTap(m, jackId, src);
    if (!tap) return;
    // The tap node's own context: a knob must never be the thing that creates an AudioContext.
    const an = tap.node.context.createAnalyser();
    an.fftSize = 32; // ~0.7 ms — an instantaneous reading, not an average that flattens an LFO
    const buf = new Float32Array(an.fftSize);
    tap.node.connect(an, tap.idx);
    // React drops --cv from the style object the moment this goes live, so seed it here or
    // the marker snaps to the dial's minimum until the first bus frame lands.
    let prev = pctRef.current;
    el.style.setProperty('--cv', String(prev));
    let last = performance.now();
    const stop = addDraw(() => {
      const t = performance.now();
      if (t - last < CV_MS) return;
      last = t;
      an.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] ?? 0;
      const raw = pctRef.current + sum / buf.length / CV_VOLTS;
      const v = Math.round((raw < 0 ? 0 : raw > 1 ? 1 : raw) * CV_STEP) / CV_STEP;
      if (v === prev) return;
      prev = v;
      el.style.setProperty('--cv', String(v));
    });
    return () => {
      stop();
      // Removing a module tears its nodes down before this cleanup runs.
      try {
        tap.node.disconnect(an);
      } catch {
        /* already disconnected */
      }
    };
  }, [m, jackId, src, ref]);

  return src !== '';
}

/** A stable poster to `m.node.port` — a no-op for native modules. */
export function usePortSend<M = unknown>(m: ModuleInstance): (msg: M) => void {
  const node = m.node;
  return useCallback((msg: M) => node?.port.postMessage(msg), [node]);
}
