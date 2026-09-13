import type { Kind } from '../core/types';

// The only place canvas paint may name a colour. Values restate src/styles/tokens.css verbatim
// and are used only when the stylesheet has not resolved; canvas-tokens.test.ts fails on drift.
export const TOKEN_FALLBACK = {
  '--kind-a': '#ffb02e',
  '--kind-p': '#5ab4ff',
  '--kind-g': '#ef2fbf',
  '--kind-c': '#68f3bf',
  '--bg': '#0a0a0b',
  '--metal-2': '#0f1012',
  '--edge': '#050506',
  '--screen': '#050607',
  '--danger': '#ff5d5d',
  '--amber': '#f3c77a',
  '--text-dim': '#8d939c',
  '--border-soft': 'rgba(255, 255, 255, 0.07)',
  '--font-mono': "ui-monospace, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
} as const;

export type TokenName = keyof typeof TOKEN_FALLBACK;

export interface Tokens {
  kind: Record<Kind, string>;
  /** `--cat`, the per-module tint; falls back to the CV kind colour like the stylesheets do. */
  cat: string;
  bg: string;
  metal2: string;
  edge: string;
  screen: string;
  danger: string;
  amber: string;
  textDim: string;
  borderSoft: string;
  fontMono: string;
}

let cache = new WeakMap<Element, Tokens>();

/** Drop every cached palette. `useCanvas` calls this whenever it resizes a canvas. */
export function invalidateTokens(): void {
  cache = new WeakMap();
}

/** The design tokens a canvas needs, read off `el` so element-scoped ones (`--cat`) resolve.
    Cached per element until `invalidateTokens()`. */
export function readTokens(el?: Element): Tokens {
  const host = el ?? document.documentElement;
  const hit = cache.get(host);
  if (hit) return hit;
  const cs = getComputedStyle(host);
  const v = (name: TokenName): string => cs.getPropertyValue(name).trim() || TOKEN_FALLBACK[name];
  const t: Tokens = {
    kind: { a: v('--kind-a'), p: v('--kind-p'), g: v('--kind-g'), c: v('--kind-c') },
    cat: cs.getPropertyValue('--cat').trim() || v('--kind-c'),
    bg: v('--bg'),
    metal2: v('--metal-2'),
    edge: v('--edge'),
    screen: v('--screen'),
    danger: v('--danger'),
    amber: v('--amber'),
    textDim: v('--text-dim'),
    borderSoft: v('--border-soft'),
    fontMono: v('--font-mono'),
  };
  cache.set(host, t);
  return t;
}
