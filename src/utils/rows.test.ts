import { describe, it, expect } from 'vitest';
import { orUndefined, orEmpty, orFalse, asOneOf } from './rows';

/*
 * The database/UI boundary. Postgres columns are nullable, the UI interfaces
 * use optional properties, and before this existed every mapper took an `any`
 * row and the mismatch was invisible.
 */
describe('orUndefined', () => {
  it('turns null into undefined and leaves values alone', () => {
    expect(orUndefined(null)).toBeUndefined();
    expect(orUndefined(undefined)).toBeUndefined();
    expect(orUndefined('text')).toBe('text');
  });

  it('preserves falsy values that are not null', () => {
    // A zero or an empty string is data, not absence.
    expect(orUndefined(0)).toBe(0);
    expect(orUndefined('')).toBe('');
    expect(orUndefined(false)).toBe(false);
  });
});

describe('orEmpty', () => {
  it('turns null into an empty string', () => {
    expect(orEmpty(null)).toBe('');
    expect(orEmpty(undefined)).toBe('');
    expect(orEmpty('text')).toBe('text');
  });
});

describe('orFalse', () => {
  it('turns null into false, not undefined', () => {
    expect(orFalse(null)).toBe(false);
    expect(orFalse(undefined)).toBe(false);
  });

  it('preserves a real boolean', () => {
    expect(orFalse(true)).toBe(true);
    expect(orFalse(false)).toBe(false);
  });
});

describe('asOneOf', () => {
  const PRIORITIES = ['low', 'medium', 'high'] as const;

  it('passes a value that is in the list', () => {
    expect(asOneOf('high', PRIORITIES, 'medium')).toBe('high');
  });

  it('falls back for a value that is not', () => {
    // This is the point: a migration that renames an enum value degrades to the
    // fallback instead of lying about the type.
    expect(asOneOf('urgent', PRIORITIES, 'medium')).toBe('medium');
  });

  it('falls back for null and undefined', () => {
    expect(asOneOf(null, PRIORITIES, 'low')).toBe('low');
    expect(asOneOf(undefined, PRIORITIES, 'low')).toBe('low');
  });

  it('does not match on case or whitespace', () => {
    expect(asOneOf('HIGH', PRIORITIES, 'medium')).toBe('medium');
    expect(asOneOf(' high', PRIORITIES, 'medium')).toBe('medium');
  });
});
