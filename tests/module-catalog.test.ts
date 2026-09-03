import { expect, test } from 'vitest';
import { allSpecs } from '../src/modules/registry';

const EXPECTED = [
  'ad',
  'adsr',
  'arp',
  'atn',
  'burst',
  'chaos',
  'chorus',
  'clock',
  'clockdiv',
  'comb',
  'comp',
  'compare',
  'crush',
  'ddelay',
  'diode',
  'dist',
  'drum2',
  'duo',
  'euklid',
  'flanger',
  'fmop',
  'fmvoice',
  'formant',
  'freeze',
  'func',
  'gate',
  'glitch',
  'grain',
  'hats',
  'kbd',
  'kick',
  'ladder',
  'lfo',
  'logic',
  'lpg',
  'matrix',
  'mix',
  'mix8',
  'monov',
  'morph',
  'mult',
  'noise',
  'noiselab',
  'out',
  'phaser',
  'pitch',
  'pluck',
  'quad',
  'quant',
  'reson',
  'reverb',
  'ring',
  'scope',
  'sdelay',
  'seq',
  'slew',
  'snh',
  'spread',
  'sswitch',
  'super',
  'svf',
  'tape',
  'turing',
  'vca',
  'vco',
  'voct',
  'volt',
  'wasp',
  'wavefold',
  'wavetable',
  'xfade',
] as const;

test('catalog is exactly the 71 planned modules', () => {
  expect(EXPECTED).toHaveLength(71);
  expect(new Set(allSpecs().map((s) => s.def.id))).toEqual(new Set(EXPECTED));
});

test('every worklet module has a registered processor name and every native has a native spec', () => {
  for (const s of allSpecs()) {
    if (s.def.worklet) expect(s.def.worklet.length).toBeGreaterThan(0);
    else expect(s.native).toBeDefined();
  }
});
