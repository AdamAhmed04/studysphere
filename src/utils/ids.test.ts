import { describe, it, expect } from 'vitest';
import { isUuid, requireUuid } from './ids';

describe('isUuid', () => {
  it('accepts a real uuid, in either case', () => {
    expect(isUuid('3f2504e0-4f89-41d3-9a0c-0305e82c3301')).toBe(true);
    expect(isUuid('3F2504E0-4F89-41D3-9A0C-0305E82C3301')).toBe(true);
  });

  it('rejects anything that is not one', () => {
    expect(isUuid('')).toBe(false);
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid('3f2504e0-4f89-41d3-9a0c')).toBe(false);       // too short
    expect(isUuid('3f2504e04f8941d39a0c0305e82c3301')).toBe(false); // no dashes
    expect(isUuid(null)).toBe(false);
    expect(isUuid(undefined)).toBe(false);
    expect(isUuid(42)).toBe(false);
  });

  it('rejects the characters that would change a filter', () => {
    // These are the ones that matter: a comma, a dot or a parenthesis inside a
    // PostgREST filter is syntax, not data.
    expect(isUuid('3f2504e0-4f89-41d3-9a0c-0305e82c3301,user_id.eq.other')).toBe(false);
    expect(isUuid('3f2504e0-4f89-41d3-9a0c-0305e82c3301)')).toBe(false);
    expect(isUuid('*')).toBe(false);
  });
});

describe('requireUuid', () => {
  it('returns the value when it is valid', () => {
    const id = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
    expect(requireUuid(id, 'user id')).toBe(id);
  });

  it('throws before a bad value can reach a query', () => {
    expect(() => requireUuid('anything', 'user id')).toThrow(/user id must be a uuid/);
  });

  it('names the argument that was wrong', () => {
    expect(() => requireUuid('', 'friend id')).toThrow(/friend id/);
  });
});
