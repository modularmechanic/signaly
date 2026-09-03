import { expect, test } from 'vitest';
import { allSpecs } from '../src/modules/registry';

const EXPECTED = [
  'adsr',
  'arp',
  'atn',
  'chorus',
  'clock',
  'clockdiv',
  'comb',
  'comp',
  'crush',
  'dist',
  'drum2',
  'ddelay',
  'duo',
  'euklid',
  'flanger',
  'formant',
  'func',
  'gate',
  'kbd',
  'ladder',
  'lfo',
  'mix',
  'monov',
  'mult',
  'noise',
  'noiselab',
  'out',
  'quad',
  'reverb',
  'scope',
  'sdelay',
  'seq',
  'snh',
  'svf',
  'tape',
  'vca',
  'vco',
  'volt',
  'voct',
  'wasp',
  'mix8',
] as const;

test('catalog is exactly the 41 planned modules', () => {
  expect(EXPECTED).toHaveLength(41);
  expect(new Set(allSpecs().map((s) => s.def.id))).toEqual(new Set(EXPECTED));
});

test('every worklet module has a registered processor name and every native has a native spec', () => {
  for (const s of allSpecs()) {
    if (s.def.worklet) expect(s.def.worklet.length).toBeGreaterThan(0);
    else expect(s.native).toBeDefined();
  }
});
