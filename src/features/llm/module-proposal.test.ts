import { describe, expect, it } from 'vitest';
import { parseProposal } from './module-proposal';

const payload = {
  slug: 'wobble',
  def: { name: 'Wobble' },
  dsp: 'registerProcessor("user:wobble", P);',
  note: 'hi',
};

describe('parseProposal', () => {
  it('accepts a tool-use object payload', () => {
    expect(parseProposal(payload)).toEqual(payload);
  });

  it('accepts a JSON string payload', () => {
    expect(parseProposal(JSON.stringify(payload))).toEqual(payload);
  });

  it('accepts a fenced JSON string', () => {
    expect(parseProposal('```json\n' + JSON.stringify(payload) + '\n```')).toEqual(payload);
  });

  it('drops an empty note', () => {
    expect(parseProposal({ ...payload, note: '' })).toEqual({ ...payload, note: undefined });
  });

  it('rejects prose that is not JSON', () => {
    expect(parseProposal('here is your module!')).toEqual({ error: 'the model did not return JSON' });
  });

  it('rejects an array payload', () => {
    expect(parseProposal([payload])).toMatchObject({ error: expect.stringContaining('module object') });
  });

  it('rejects a bad slug', () => {
    expect(parseProposal({ ...payload, slug: 'Wobble!' })).toMatchObject({
      error: expect.stringContaining('slug'),
    });
  });

  it('rejects a missing def and a missing dsp', () => {
    expect(parseProposal({ ...payload, def: 'nope' })).toEqual({ error: 'def is missing' });
    expect(parseProposal({ ...payload, dsp: '  ' })).toEqual({ error: 'dsp source is missing' });
  });

  it('rejects an oversized dsp source', () => {
    expect(parseProposal({ ...payload, dsp: 'x'.repeat(70000) })).toMatchObject({
      error: expect.stringContaining('exceeds'),
    });
  });
});
