import { describe, it, expect } from 'vitest';
import { errorMessage } from './errors';

describe('errorMessage', () => {
  it('reads the message off an Error', () => {
    expect(errorMessage(new Error('boom'), 'fallback')).toBe('boom');
  });

  it('reads a PostgrestError, which is a plain object and not an Error', () => {
    // This is the case the helper exists for. Supabase rejects with an object
    // carrying message and code; an `instanceof Error` check on its own drops
    // the useful message and reports the generic fallback instead.
    const postgrestError = { message: 'duplicate key value violates unique constraint', code: '23505', details: null, hint: null };
    expect(errorMessage(postgrestError, 'fallback')).toBe('duplicate key value violates unique constraint');
  });

  it('accepts a thrown string', () => {
    expect(errorMessage('just a string', 'fallback')).toBe('just a string');
  });

  it('falls back for values that carry no message', () => {
    expect(errorMessage(null, 'fallback')).toBe('fallback');
    expect(errorMessage(undefined, 'fallback')).toBe('fallback');
    expect(errorMessage(42, 'fallback')).toBe('fallback');
    expect(errorMessage({}, 'fallback')).toBe('fallback');
  });

  it('falls back rather than returning an empty message', () => {
    // An Error with an empty message is worse than the fallback: the user gets
    // a blank toast.
    expect(errorMessage(new Error(''), 'fallback')).toBe('fallback');
    expect(errorMessage({ message: '' }, 'fallback')).toBe('fallback');
    expect(errorMessage('', 'fallback')).toBe('fallback');
  });

  it('ignores a non-string message property', () => {
    expect(errorMessage({ message: { nested: true } }, 'fallback')).toBe('fallback');
  });
});
