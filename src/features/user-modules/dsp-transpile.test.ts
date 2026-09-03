import { describe, expect, it } from 'vitest';
import { bindProcessorName, transpileDsp } from './dsp-transpile';

const NAME = 'user:wobble@1';
const body = (extra = ''): string =>
  `class P extends Base {
     defaults(): Record<string, number> { return { rate: 2 }; }
     process(I: Float32Array[][], O: Float32Array[][]): boolean {
       ${extra}
       const out = O[0][0], n = out.length;
       for (let i = 0; i < n; i++) out[i] = clamp(this.p.rate, -5, 5);
       return true;
     }
   }
   registerProcessor('${NAME}', P);`;

describe('transpileDsp', () => {
  it('emits JS with the real prelude inlined and no export keywords', () => {
    const r = transpileDsp(body(), NAME);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.code).toContain('class Base extends AudioWorkletProcessor');
    expect(r.code).toContain('class ClockSync');
    expect(r.code).not.toContain('export ');
    expect(r.code).not.toContain('<reference');
    expect(r.code).not.toContain(': Float32Array[][]');
    expect(r.code).toContain(`registerProcessor('${NAME}', P)`);
  });

  it('emits code that actually evaluates in a worklet-like scope', () => {
    const src = `class P extends Base {
      t = 0;
      defaults() { return { freq: 220 }; }
      process(I: Float32Array[][], O: Float32Array[][]) {
        const out = O[0][0], n = out.length, dt = this.p.freq / sampleRate;
        for (let i = 0; i < n; i++) { out[i] = 5 * oscW(2, this.t, dt); this.t = (this.t + dt) % 1; }
        return true;
      }
    }
    registerProcessor('user:saw', P);`;
    const r = transpileDsp(bindProcessorName(src, 'user:saw@9'), 'user:saw@9');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    class FakeProcessor {
      port = { onmessage: null };
    }
    let registered: [string, unknown] | null = null;
    const load = new Function('AudioWorkletProcessor', 'sampleRate', 'registerProcessor', r.code) as (
      p: unknown,
      sr: number,
      reg: (name: string, ctor: unknown) => void,
    ) => void;
    load(FakeProcessor, 48000, (name, ctor) => (registered = [name, ctor]));
    const entry = registered as [string, unknown] | null;
    expect(entry?.[0]).toBe('user:saw@9');
    const Ctor = entry?.[1] as new (o: unknown) => { process(i: unknown, o: Float32Array[][]): boolean };
    const out = [[new Float32Array(128)]];
    expect(new Ctor({ processorOptions: { p: { freq: 440 } } }).process([], out)).toBe(true);
    expect(out[0]?.[0]?.every((v) => Number.isFinite(v) && Math.abs(v) <= 5.01)).toBe(true);
  });

  it('strips import lines', () => {
    const src = `import { clamp } from './x';\nimport type { A } from 'b';\n${body()}`;
    const r = transpileDsp(src, NAME);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.code).not.toContain("from './x'");
  });

  it('rejects each forbidden global on its own', () => {
    const globals = [
      'eval',
      'Function',
      'importScripts',
      'fetch',
      'XMLHttpRequest',
      'WebSocket',
      'SharedArrayBuffer',
      'window',
      'document',
      'localStorage',
      'globalThis',
    ];
    for (const g of globals) {
      const r = transpileDsp(body(`${g}.x;`), NAME);
      expect(r.ok, g).toBe(false);
      if (!r.ok) expect(r.error).toContain(g);
    }
  });

  it('rejects a mismatched processor name', () => {
    const r = transpileDsp(body(), 'user:other@2');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('user:other@2');
  });

  it('rejects empty and oversized sources', () => {
    expect(transpileDsp('   ', NAME).ok).toBe(false);
    expect(transpileDsp(`${'/*x*/'.repeat(20000)}${body()}`, NAME).ok).toBe(false);
  });

  it('reports a syntax error instead of throwing', () => {
    const r = transpileDsp(`class P extends Base { process( }\nregisterProcessor('${NAME}', P);`, NAME);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('failed to compile');
  });
});

describe('bindProcessorName', () => {
  it('repoints the author call at the bumped runtime name', () => {
    const out = bindProcessorName(`registerProcessor("user:wobble", P);`, 'user:wobble@7');
    expect(out).toBe(`registerProcessor('user:wobble@7', P);`);
  });
});
