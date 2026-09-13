import { afterEach, describe, expect, it, vi } from 'vitest';
import envSrc from '../ui/atoms/env-display.tsx?raw';
import cableSrc from '../ui/molecules/cable-canvas.tsx?raw';
import meterSrc from '../ui/molecules/meter-display.tsx?raw';
import scopeSrc from '../ui/molecules/scope-display.tsx?raw';
import { invalidateTokens, readTokens, TOKEN_FALLBACK } from './canvas-tokens';

// Stand in for a resolved stylesheet: every property the reader asks for answers with its name,
// so a mis-wired field shows up as the wrong token rather than as a plausible colour.
const stub = (props: Record<string, string>): void => {
  vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    getPropertyValue: (n: string) => props[n] ?? '',
  } as unknown as CSSStyleDeclaration);
};

afterEach(() => {
  vi.restoreAllMocks();
  invalidateTokens();
});

describe('readTokens', () => {
  it('reads every field off the element', () => {
    stub({
      '--kind-a': 'A',
      '--kind-p': 'P',
      '--kind-g': 'G',
      '--kind-c': 'C',
      '--cat': 'CAT',
      '--bg': 'BG',
      '--metal-2': 'METAL2',
      '--edge': 'EDGE',
      '--screen': 'SCREEN',
      '--danger': 'DANGER',
      '--amber': 'AMBER',
      '--text-dim': 'DIM',
      '--border-soft': 'SOFT',
      '--font-mono': 'MONO',
    });
    expect(readTokens(document.createElement('canvas'))).toEqual({
      kind: { a: 'A', p: 'P', g: 'G', c: 'C' },
      cat: 'CAT',
      bg: 'BG',
      metal2: 'METAL2',
      edge: 'EDGE',
      screen: 'SCREEN',
      danger: 'DANGER',
      amber: 'AMBER',
      textDim: 'DIM',
      borderSoft: 'SOFT',
      fontMono: 'MONO',
    });
  });

  it('falls back per property when the stylesheet has not resolved', () => {
    stub({ '--amber': 'AMBER' });
    const t = readTokens(document.createElement('canvas'));
    expect(t.amber).toBe('AMBER');
    expect(t.bg).toBe(TOKEN_FALLBACK['--bg']);
    expect(t.kind.a).toBe(TOKEN_FALLBACK['--kind-a']);
    // no --cat outside a module panel: the CV kind colour stands in, as the stylesheets do
    expect(t.cat).toBe(TOKEN_FALLBACK['--kind-c']);
  });

  it('caches per element until invalidated', () => {
    stub({ '--bg': 'ONE' });
    const el = document.createElement('canvas');
    expect(readTokens(el).bg).toBe('ONE');
    stub({ '--bg': 'TWO' });
    expect(readTokens(el).bg).toBe('ONE');
    invalidateTokens();
    expect(readTokens(el).bg).toBe('TWO');
  });

  it('defaults to the document root', () => {
    stub({ '--bg': 'ROOT' });
    expect(readTokens().bg).toBe('ROOT');
  });
});

describe('canvas paint is token-sourced', () => {
  it('no canvas file names a colour of its own', () => {
    const files: [string, string][] = [
      ['cable-canvas', cableSrc],
      ['meter-display', meterSrc],
      ['scope-display', scopeSrc],
      ['env-display', envSrc],
    ];
    for (const [name, text] of files) {
      expect(text, `${name} has a literal hex colour`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(text, `${name} reads a custom property directly`).not.toMatch(/getComputedStyle/);
    }
  });
});

describe('the fallback table matches tokens.css', () => {
  // The table restates tokens.css so a canvas can paint before the sheet resolves. Read the real
  // stylesheet off disk rather than importing it: vitest stubs CSS imports, so `?raw` yields ''.
  it('every fallback equals the declared token', async () => {
    const sheets = import.meta.glob('../styles/tokens.css', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    const css = Object.values(sheets)[0] ?? '';
    const decl = (name: string): string | undefined =>
      new RegExp(`^\\s*${name}:\\s*(.+?);\\s*$`, 'm').exec(css)?.[1];
    for (const [name, fallback] of Object.entries(TOKEN_FALLBACK)) {
      let declared = decl(name);
      // A token may alias a base one (--amber: var(--amber-base)) so a faceplate can re-ink it.
      const alias = /^var\((--[\w-]+)\)$/.exec(declared ?? '')?.[1];
      if (alias) declared = decl(alias);
      expect(declared, `${name} is not declared in tokens.css`).toBeDefined();
      expect(declared, `${name} fallback has drifted from tokens.css`).toBe(fallback);
    }
  });
});
