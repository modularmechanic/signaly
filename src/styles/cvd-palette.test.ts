import { describe, expect, it } from 'vitest';

// The four Signal Kind colours must stay apart for dichromatic viewers, not just for trichromats.
// The budget was recorded in plans/open-questions.md and then drifted below it unnoticed: the
// Blackline rework re-checked only the pair that had failed and recorded the whole palette as
// passing, while gate sat at deutan 18.9 and tritan 11.0 against thresholds of 20 and 15.
// Viénot/Brettel dichromacy simulation, CIE76 distance, matching the recorded derivation.
const BUDGET = { protan: 20, deutan: 20, tritan: 15 } as const;

const sheets = import.meta.glob('./tokens.css', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const css = Object.values(sheets)[0] ?? '';

type Vec = [number, number, number];
type Mat = [Vec, Vec, Vec];

const mul = (m: Mat, v: Vec): Vec => [
  m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
  m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
  m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
];

const RGB2LMS: Mat = [
  [17.8824, 43.5161, 4.11935],
  [3.45565, 27.1554, 3.86714],
  [0.0299566, 0.184309, 1.46709],
];
const LMS2RGB: Mat = [
  [0.080944, -0.130504, 0.116721],
  [-0.0102485, 0.0540194, -0.113615],
  [-0.000365294, -0.00412163, 0.693513],
];
const SIM: Record<keyof typeof BUDGET, Mat> = {
  protan: [
    [0, 2.02344, -2.52581],
    [0, 1, 0],
    [0, 0, 1],
  ],
  deutan: [
    [1, 0, 0],
    [0.494207, 0, 1.24827],
    [0, 0, 1],
  ],
  tritan: [
    [1, 0, 0],
    [0, 1, 0],
    [-0.395913, 0.801109, 0],
  ],
};

const toLinear = (c: number): number =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

const hexToRgb = (hex: string): Vec =>
  [0, 2, 4].map((i) => parseInt(hex.replace('#', '').slice(i, i + 2), 16)) as Vec;

function toLab(rgb: Vec): Vec {
  const lin = rgb.map((c) => toLinear(c / 255)) as Vec;
  const xyz = mul(
    [
      [0.4124, 0.3576, 0.1805],
      [0.2126, 0.7152, 0.0722],
      [0.0193, 0.1192, 0.9505],
    ],
    lin,
  );
  const white: Vec = [0.95047, 1.0, 1.08883];
  const f = xyz.map((v, i) => {
    const r = v / (white[i] ?? 1);
    return r > 0.008856 ? Math.cbrt(r) : 7.787 * r + 16 / 116;
  }) as Vec;
  return [116 * f[1] - 16, 500 * (f[0] - f[1]), 200 * (f[1] - f[2])];
}

function simulate(rgb: Vec, kind: keyof typeof BUDGET): Vec {
  const lin = rgb.map((c) => toLinear(c / 255)) as Vec;
  return mul(LMS2RGB, mul(SIM[kind], mul(RGB2LMS, lin))).map((c) => {
    const k = Math.min(1, Math.max(0, c));
    return (k <= 0.0031308 ? k * 12.92 : 1.055 * Math.pow(k, 1 / 2.4) - 0.055) * 255;
  }) as Vec;
}

const deltaE = (a: Vec, b: Vec): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function token(name: string): string {
  const hit = new RegExp(`^\\s*${name}:\\s*(#[0-9a-fA-F]{6});`, 'm').exec(css)?.[1];
  if (!hit) throw new Error(`${name} is not a six-digit hex in tokens.css`);
  return hit;
}

describe('the Signal Kind palette clears its colour-vision budget', () => {
  const kinds = ['--kind-a', '--kind-p', '--kind-g', '--kind-c'] as const;

  it('reads four distinct kind colours from tokens.css', () => {
    expect(new Set(kinds.map(token)).size, 'two Signal Kinds share a colour').toBe(4);
  });

  for (const kind of ['protan', 'deutan', 'tritan'] as const) {
    it(`keeps every pair apart under ${kind} simulation`, () => {
      let worst = { d: Infinity, pair: '' };
      for (let i = 0; i < kinds.length; i++) {
        for (let j = i + 1; j < kinds.length; j++) {
          const a = hexToRgb(token(kinds[i] ?? ''));
          const b = hexToRgb(token(kinds[j] ?? ''));
          const d = deltaE(toLab(simulate(a, kind)), toLab(simulate(b, kind)));
          if (d < worst.d) worst = { d, pair: `${kinds[i]} vs ${kinds[j]}` };
        }
      }
      expect(worst.d, `closest pair under ${kind} is ${worst.pair}`).toBeGreaterThanOrEqual(
        BUDGET[kind],
      );
    });
  }
});
