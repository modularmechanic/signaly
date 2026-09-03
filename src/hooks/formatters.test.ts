import { describe, expect, it } from 'vitest';
import { FMT, fmtValue, isIntFmt } from './formatters';

describe('formatters', () => {
  it('switches units by magnitude', () => {
    expect(FMT.fHz(2000)).toBe('2.00 kHz');
    expect(FMT.fHz(440)).toBe('440 Hz');
    expect(FMT.fHz(4.5)).toBe('4.5 Hz');
    expect(FMT.fMs(1.5)).toBe('1.50 s');
    expect(FMT.fMs(0.25)).toBe('250 ms');
  });

  it('clamps and wraps table lookups instead of returning undefined', () => {
    expect(FMT.fKey(-1)).toBe('B');
    expect(FMT.fKey(12)).toBe('C');
    expect(FMT.fChord(99)).toBe('PENTA');
    expect(FMT.fShape(-5)).toBe('UP');
    expect(FMT.fRate(3)).toBe('x1');
  });

  it('defaults to f1 and flags integer knobs', () => {
    expect(fmtValue(undefined, 0.5)).toBe('0.50');
    expect(fmtValue('fPc', 0.5)).toBe('50 %');
    expect(isIntFmt('fInt')).toBe(true);
    expect(isIntFmt('fRate')).toBe(true);
    expect(isIntFmt('fHz')).toBe(false);
    expect(isIntFmt(undefined)).toBe(false);
  });

  it('every table-index format steps by whole indices', () => {
    for (const f of ['fKey', 'fChord', 'fShape', 'fRate'] as const) expect(isIntFmt(f)).toBe(true);
  });
});
