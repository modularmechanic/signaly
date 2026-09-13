import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Kind } from '../src/core/types';
import { getSpec } from '../src/modules/registry';
import { dspSlugs, loadProcessor, SR } from './dsp-harness';

// The floor every AI-generated User Module already clears, read off dsp-verify.ts itself so the
// built-in floor and the User Module floor stay ONE number. Same trick as the LED check in
// module-contract-sweep.test.ts: the source is the contract.
const verifySrc =
  Object.values(
    import.meta.glob<string>('../src/features/user-modules/dsp-verify.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }),
  )[0] ?? '';
const MAX_ABS = Number(/MAX_ABS = (\d+(?:\.\d+)?)/.exec(verifySrc)?.[1]);
const BLOCKS = 64; // 8192 frames, the render length verifyDsp uses

const N = 128;
const TP = Math.PI * 2;

/** A plausible patch for a jack of this kind, continuous across blocks. */
function feed(kind: Kind, block: number): Float32Array {
  const b = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const t = (block * N + i) / SR;
    b[i] =
      kind === 'a'
        ? 5 * Math.sin(TP * 220 * t) // audio ±5 V
        : kind === 'g'
          ? ((t * 4) % 1 < 0.5 ? 5 : 0) // 4 Hz gate, 0/5 V
          : kind === 'p'
            ? 1 // 1 V/oct, one octave above C4
            : 5 * Math.sin(TP * 2 * t); // CV: a slow bipolar sweep
  }
  return b;
}

type Phase = 'unpatched' | 'silence' | 'signal';

function inputs(kinds: Kind[], phase: Phase, block: number): Float32Array[][] {
  if (phase === 'unpatched') return []; // nothing connected — what a fresh rack module sees
  return kinds.map((k) => [phase === 'silence' ? new Float32Array(N) : feed(k, block)]);
}

// quad, duo, noise and lfo take state from Math.random. A fixed sequence — not a constant,
// which would pin noise's `random()*2-1` to silence and pass it vacuously — makes every module
// reproducible; the seed resets per test so a module's run does not depend on test order.
let seed = 1;

beforeAll(() => {
  vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff;
    return seed / 0x80000000;
  });
});

beforeEach(() => {
  seed = 1;
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe('every DSP clears the User Module floor', () => {
  it('reads the range bound out of dsp-verify.ts', () => {
    expect(verifySrc, 'dsp-verify.ts did not load as raw source').not.toBe('');
    expect(MAX_ABS, 'dsp-verify.ts no longer declares `MAX_ABS = <number>`').toBeGreaterThan(0);
  });

  for (const slug of dspSlugs()) {
    it(`${slug} stays finite and in range`, async () => {
      const def = getSpec(slug)?.def;
      expect(def, `${slug}.dsp.ts has no registered def`).toBeDefined();
      if (!def) return;
      const kinds = def.ins.map((j) => j.kind);
      const outs = def.outs.length ? def.outs.map((j) => j.id) : ['out'];

      for (const phase of ['unpatched', 'silence', 'signal'] as const) {
        const d = await loadProcessor(slug);
        const O = outs.map(() => [new Float32Array(N)]);
        for (let b = 0; b < BLOCKS; b++) {
          d.process(inputs(kinds, phase, b), O);
          for (let o = 0; o < O.length; o++) {
            for (const x of O[o]![0]!) {
              if (Number.isFinite(x) && x <= MAX_ABS && x >= -MAX_ABS) continue;
              // One expect per bad sample would drown the report; name the first and stop.
              expect.fail(
                `${slug} out '${outs[o]}' produced ${x} in block ${b} with inputs ${phase} — ` +
                  `verifyDsp would reject this DSP from a User Module`,
              );
            }
          }
        }
      }
    });
  }
});
