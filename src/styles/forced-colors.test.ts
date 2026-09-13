import { describe, expect, it } from 'vitest';

// The focus ring is a box-shadow, and forced-colors mode strips box-shadow, so without an explicit
// outline every control in the app loses its focus indicator. Nothing renders in jsdom that could
// catch that, so this reads the stylesheet.
const sheets = import.meta.glob('./base.css', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const css = Object.values(sheets)[0] ?? '';

function block(): string {
  const at = css.indexOf('@media (forced-colors: active)');
  if (at < 0) throw new Error('base.css has no forced-colors block');
  // Walk braces so the assertions cannot accidentally match rules outside the block.
  let depth = 0;
  for (let i = css.indexOf('{', at); i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(at, i + 1);
  }
  throw new Error('forced-colors block is unterminated');
}

describe('forced-colors mode keeps the app usable', () => {
  it('reads a non-empty stylesheet', () => {
    // Guards the guard: vitest stubs CSS imports unless vite.config.ts opts this file in, and an
    // empty string would make every assertion below pass vacuously.
    expect(css.length, 'base.css read as empty — check test.css.include').toBeGreaterThan(200);
  });

  it('restores a focus outline, since the box-shadow ring is stripped', () => {
    const b = block();
    expect(b).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid Highlight/);
  });

  it('uses system colours only, never design tokens', () => {
    // var() is substituted away in forced colours, so a token here would silently do nothing.
    expect(block(), 'forced-colors block must not reference a custom property').not.toMatch(
      /var\(--/,
    );
  });

  it('gives every gradient-only control a silhouette', () => {
    const b = block();
    for (const sel of ['.knob', '.knob-cap', '.fader', '.fader-cap', '.led', '.mpk', '.screw']) {
      expect(b, `${sel} would flatten to a blank block`).toMatch(
        new RegExp(`\\${sel}[,\\s]`),
      );
    }
    expect(b).toMatch(/border:\s*1px solid CanvasText/);
  });
});
