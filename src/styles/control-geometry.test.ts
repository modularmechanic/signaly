import { describe, expect, it } from 'vitest';
import mainSrc from '../main.tsx?raw';
import { HP_PX } from '../modules/panel-layout';

// Every number below used to live in TS and in CSS at once, with a comment as the only contract —
// which is how the piano's 26px key kept a 9px offset after the panel was rescaled by 1.44. Each
// is now one custom property, and these guards fail if a dependent stops deriving from it.

// Globbed off disk, not imported: vitest stubs a plain CSS import to ''. Same trick as the
// tokens.css drift guard in hooks/canvas-tokens.test.ts. Comments are stripped so a selector
// never picks up the comment sitting above it.
const sheets = import.meta.glob('./*.css', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const read = (name: string): string => {
  const src = sheets[name] ?? '';
  // A guard that reads an empty sheet passes vacuously; this file has shipped that bug before.
  if (src.trim() === '') throw new Error(`${name} read as empty — widen test.css.include`);
  return src.replace(/\/\*[\s\S]*?\*\//g, '');
};
const controls = read('./controls.css');
const panel = read('./panel.css');
const base = read('./base.css');
const cables = read('./cables.css');

// Every top-level declaration block whose selector list names `selector`, whitespace-normalised —
// a rule may be shared, and blocks nested in an at-rule are deliberately out of scope.
const rules = (css: string, selector: string): string => {
  const found = css
    .split('}')
    .filter((chunk) => (chunk.split('{')[0] ?? '').split(',').some((s) => s.trim() === selector))
    .map((chunk) =>
      chunk
        .slice(chunk.indexOf('{') + 1)
        .replace(/\s+/g, ' ')
        .trim(),
    );
  if (found.length === 0) throw new Error(`no rule for ${selector}`);
  return found.join(' ');
};

describe('knob sweep', () => {
  const parts = ['.knob', '.knob::before', '.knob-cap', '.knob-cv'] as const;

  it('is one token every dependent reads', () => {
    expect(rules(controls, '.knob')).toMatch(/--sweep: 270deg;/);
    // The ring, the pointer and the CV marker — change --sweep and all three follow.
    for (const sel of ['.knob::before', '.knob-cap', '.knob-cv'])
      expect(rules(controls, sel)).toMatch(/var\(--sweep\)/);
    // Pointer and marker are the same expression, so they cannot drift apart by a sign or a half.
    const angle = /transform: rotate\(calc\(var\(--\w+, 0\) \* var\(--sweep\) - var\(--sweep\) \/ 2\)\)/;
    expect(rules(controls, '.knob-cap')).toMatch(angle);
    expect(rules(controls, '.knob-cv')).toMatch(angle);
  });

  it('is restated nowhere, in either language', () => {
    const drawn = parts.map((s) => rules(controls, s)).join(' ');
    expect(drawn.replace('--sweep: 270deg;', '')).not.toMatch(/\b(?:270|225|135)deg\b/);
  });
});

describe('fader cap', () => {
  const parts = ['.fader', '.fader-cap', '.fader-cap::after'] as const;

  it('is one token the fill, the cap and the indicator line all read', () => {
    expect(rules(controls, '.fader')).toMatch(/--cap: calc\(19 \* var\(--u\)\);/);
    // The fill stops at the indicator line, which sits half a cap below the cap's top edge.
    expect(rules(controls, '.fader')).toMatch(
      /var\(--cap\) \/ 2 \+ var\(--pct, 0\) \* \(100% - var\(--cap\)\)/,
    );
    expect(rules(controls, '.fader-cap')).toMatch(/\(100% - var\(--cap\)\)/);
    expect(rules(controls, '.fader-cap')).toMatch(/height: var\(--cap\);/);
    expect(rules(controls, '.fader-cap::after')).toMatch(/var\(--cap\)/);
  });

  it('is restated nowhere', () => {
    const drawn = parts.map((s) => rules(controls, s)).join(' ');
    expect(drawn.replace('--cap: calc(19 * var(--u));', '')).not.toMatch(/\b(?:19|9\.5)\b/);
  });
});

describe('piano black key', () => {
  it('is centred on its boundary: the offset is half the width, from the same token', () => {
    const mpk = rules(panel, '.mpk.b');
    expect(mpk).toMatch(/--bk-w: calc\(26 \* var\(--u\)\);/);
    expect(mpk).toMatch(/width: var\(--bk-w\);/);
    expect(mpk).toMatch(/left: calc\(var\(--bk, 0\) \/ 7 \* 100% - var\(--bk-w\) \/ 2\);/);
    // The regression this replaces: a half-width written out as a number of its own.
    expect(mpk.replace('--bk-w: calc(26 * var(--u));', '')).not.toMatch(/\b(?:26|13|9)\b/);
  });
});

/** Top-level at-rule blocks as { prelude, body }, whitespace-normalised. `rules` above is
    deliberately blind to these, and both guards below live inside one. */
function atRules(css: string): { prelude: string; body: string }[] {
  const out: { prelude: string; body: string }[] = [];
  const flat = (s: string): string => s.replace(/\s+/g, ' ').trim();
  for (let i = 0; i < css.length; i++) {
    if (css[i] !== '@') continue;
    const open = css.indexOf('{', i);
    if (open < 0) break;
    let depth = 0;
    for (let j = open; j < css.length; j++) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}' && --depth === 0) {
        out.push({ prelude: flat(css.slice(i, open)), body: flat(css.slice(open + 1, j)) });
        i = j;
        break;
      }
    }
  }
  return out;
}

const count = (css: string, needle: RegExp): number => (css.match(needle) ?? []).length;

describe('faceplate screws', () => {
  const wide = rules(panel, '.screws');
  const narrow = atRules(panel).find((r) => r.prelude.startsWith('@container') && r.body.includes('.screws'));

  it('is four background layers on one element, each with its own position', () => {
    expect(count(wide, /var\(--head\)/g)).toBe(4);
    expect(count(wide, /var\(--socket\)/g)).toBe(4);
    const spots = wide.split('background-position:')[1]?.split(';')[0]?.split(',');
    expect(spots).toHaveLength(8);
  });

  it('carries two screws on a diagonal once the panel is 4 HP or narrower', () => {
    // Real 2-4 HP hardware has two; four 11px heads at a 6px inset leave 18px of clear
    // faceplate on a 2 HP panel. The breakpoint has to keep meaning "4 HP" if HP_PX moves.
    const px = Number(/max-width: ([\d.]+)px/.exec(narrow?.prelude ?? '')?.[1]);
    expect(px).toBeGreaterThanOrEqual(4 * HP_PX);
    expect(px).toBeLessThan(5 * HP_PX);
    expect(count(narrow?.body ?? '', /var\(--head\)/g)).toBe(2);
    const spots = narrow?.body.split('background-position:')[1]?.split(';')[0]?.split(',');
    expect(spots).toHaveLength(4);
    // opposite corners, not an edge pair
    expect(narrow?.body).toMatch(/var\(--screw-inset\) var\(--screw-inset\)/);
    expect(narrow?.body).toMatch(/calc\(100% - var\(--screw-inset\)\) calc\(100% - var\(--screw-inset\)\)/);
  });
});

describe('forced colours', () => {
  const fc = atRules(base).find((r) => r.prelude.includes('forced-colors'));

  it('restores a focus indicator the stripped box-shadow can no longer draw', () => {
    // outline survives forced-colors mode; the global :focus-visible box-shadow does not.
    expect(fc?.body).toMatch(/:focus-visible \{ outline: 2px solid Highlight; outline-offset: 2px; \}/);
  });

  it('gives the art-only elements a border, in system colours and nothing else', () => {
    const list = /([^{}]+)\{ border: 1px solid CanvasText; \}/.exec(fc?.body ?? '')?.[1] ?? '';
    expect(new Set(list.split(',').map((s) => s.trim()))).toEqual(
      new Set([
        '.knob',
        '.knob-cap',
        '.fader',
        '.fader-cap',
        '.led',
        '.mpk',
        // live-data bars: a background colour, so forced colours leave them blank without this
        '.channel-vu-fill',
        '.row-bar > i',
      ]),
    );
    // a design token here resolves to the author's colour, which is the thing the mode replaces
    expect(fc?.body).not.toMatch(/var\(--/);
  });
});

/** Every selector a top-level at-rule block declares, in source order. */
const selectorsIn = (body: string): string[] =>
  body
    .split('}')
    .flatMap((chunk) => (chunk.split('{')[0] ?? '').split(','))
    .map((s) => s.trim())
    .filter(Boolean);

describe('rack unit', () => {
  it('derives --u, --panel-h and the art widths from the TS constants, not from literals', () => {
    // The whole rack scales from --hp because everything else is published as a multiple of it.
    expect(mainSrc).toMatch(/'--u',\s*`calc\(var\(--hp\) \/ \$\{HP_PX\}\)`/);
    expect(mainSrc).toMatch(/'--panel-h',\s*`calc\(\$\{PANEL_H\} \* var\(--u\)\)`/);
    expect(mainSrc).toMatch(/'--jack-d',\s*`calc\(\$\{JACK_D_PX\} \* var\(--u\)\)`/);
    expect(mainSrc).toMatch(/'--fader-w',\s*`calc\(\$\{FADER_W_PX\} \* var\(--u\)\)`/);
    expect(mainSrc).toMatch(/'--fader-pad',\s*`calc\(\$\{FADER_PAD_PX\} \* var\(--u\)\)`/);
  });

  it('draws the socket and the fader slot from those widths alone', () => {
    expect(rules(cables, '.jack')).toMatch(/width: var\(--jack-d\);/);
    expect(rules(cables, '.jack')).toMatch(/height: var\(--jack-d\);/);
    expect(rules(controls, '.fader')).toMatch(/width: var\(--fader-w\);/);
    expect(rules(controls, '.fader')).toMatch(/padding: 0 var\(--fader-pad\);/);
    // The socket's own machining is in --u too: the ring (a colour-blind channel) and the
    // drop shadow are the only px left, so --hp scales the art and not just the box.
    const socket = rules(cables, '.jack')
      .replace(/border: [^;]+;/, '')
      .replace(/box-shadow:[^;]+;/, '');
    expect(socket).not.toMatch(/\d+(?:\.\d+)?px/);
    expect(rules(controls, '.fader')).not.toMatch(/\d+(?:\.\d+)?px/);
  });

  it('lets no coarse-pointer block resize a control the layout packs to', () => {
    // The defect this guards: `.jack` grew to 46px and `.fader` to 26px under a coarse pointer
    // while panel-layout kept packing columns for the fine-pointer art. The >=44px pseudo
    // targets are the touch floor; --hp is the lever for bigger hardware.
    for (const css of [cables, controls]) {
      for (const at of atRules(css).filter((r) => r.prelude.includes('pointer: coarse'))) {
        expect(selectorsIn(at.body)).not.toContain('.jack');
        expect(selectorsIn(at.body)).not.toContain('.fader');
      }
    }
  });

  it('publishes --d as the knob size input, clamped by the container and used as one', () => {
    expect(rules(controls, '.knob')).toMatch(/--d: calc\(46 \* var\(--u\)\);/);
    expect(rules(controls, '.knob')).toMatch(/width: min\(var\(--d\), var\(--d-fit\)\);/);
    // mix8 used to reach into a private of controls.css; it now sets the published input.
    expect(rules(read('./mix8.css'), '.mix8-bands .knob')).toMatch(/--d: calc\(38 \* var\(--u\)\);/);
  });
});
