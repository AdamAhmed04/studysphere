/*
 * sanitizeHtml used to live here, escaping text into HTML entities before it
 * was stored. It has been removed rather than left unused, because its
 * existence is what invited the bug: escaping on the way *in* is the wrong
 * model for this app.
 *
 * React escapes every value it renders through {expression}, and nothing in
 * this codebase uses dangerouslySetInnerHTML. Escaping before storage meant
 * the text was escaped twice, so "Tom & Jerry" was written to the database as
 * "Tom &amp; Jerry" and displayed that way. The stored data was corrupted, not
 * just the display.
 *
 * The principle: escape at the point of rendering, for the format being
 * rendered into — never at the point of storage. If this data is ever rendered
 * somewhere React is not doing that job (an email, a native view), that
 * renderer escapes it then.
 */

export const sanitizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return url;
  } catch {
    return '';
  }
};

export const stripTags = (html: string): string => {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

export const escapeRegex = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Normalises user input for storage: trims surrounding whitespace and caps the
 * length. Deliberately does NOT escape HTML — see the note at the top of this
 * file.
 */
export const sanitizeInput = (input: string, maxLength: number = 500): string => {
  return truncate(input.trim(), maxLength);
};
