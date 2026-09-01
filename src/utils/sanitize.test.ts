import { describe, it, expect } from 'vitest';
import { sanitizeInput, truncate, validateEmail } from './sanitize';

describe('sanitizeInput', () => {
  it('trims surrounding whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello');
  });

  it('does not escape HTML', () => {
    // The old version escaped before storing, and React escaped again on
    // render, so an ampersand reached the screen as &amp;.
    expect(sanitizeInput('Tom & Jerry <3 "quotes" 5 > 3'))
      .toBe('Tom & Jerry <3 "quotes" 5 > 3');
  });

  it('leaves input shorter than the cap untouched', () => {
    expect(sanitizeInput('short', 100)).toBe('short');
  });

  it('never returns more characters than the cap', () => {
    // The database now enforces these lengths, so returning maxLength + 3 -
    // which is what appending an ellipsis after cutting would do - produces a
    // constraint violation on save rather than a tidy truncation.
    const result = sanitizeInput('x'.repeat(3000), 2000);
    expect(result.length).toBeLessThanOrEqual(2000);
  });

  it('trims before measuring, so trailing spaces do not eat the budget', () => {
    expect(sanitizeInput('abc' + ' '.repeat(50), 5)).toBe('abc');
  });
});

describe('truncate', () => {
  it('leaves short strings alone', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('marks that it cut something', () => {
    expect(truncate('abcdefghij', 5)).toMatch(/\.\.\.$/);
  });

  it('respects the limit it was given', () => {
    expect(truncate('abcdefghij', 5).length).toBeLessThanOrEqual(5);
  });
});

describe('validateEmail', () => {
  it('accepts ordinary addresses', () => {
    expect(validateEmail('someone@example.com')).toBe(true);
    expect(validateEmail('first.last+tag@sub.example.co.uk')).toBe(true);
  });

  it('rejects malformed ones', () => {
    expect(validateEmail('no-at-sign')).toBe(false);
    expect(validateEmail('missing@domain')).toBe(false);
    expect(validateEmail('has space@example.com')).toBe(false);
    expect(validateEmail('')).toBe(false);
  });
});
