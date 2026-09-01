import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  dataUrlToBlob,
  stashPendingAvatar,
  readPendingAvatar,
  clearPendingAvatar,
} from './avatar';

/*
 * `downscaleImage` needs a canvas and is left to the browser. What is pinned
 * here is everything around it: the parked-photo handoff that carries a signup
 * photo across the email confirmation, and the decode that turns it back into
 * bytes storage will accept.
 *
 * Vitest runs in Node, where `localStorage` does not exist. That is not a gap
 * in the harness — it is the same situation as Safari private browsing, so it
 * makes "storage is unavailable" the default case rather than a contrived one.
 */

const stubLocalStorage = (): Map<string, string> => {
  const store = new Map<string, string>();

  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  });

  return store;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('dataUrlToBlob', () => {
  it('decodes the payload and keeps the declared type', async () => {
    // "hi" in base64
    const blob = dataUrlToBlob('data:image/jpeg;base64,aGk=');

    expect(blob.type).toBe('image/jpeg');
    expect(await blob.text()).toBe('hi');
  });

  it('rejects a string that is not a data URL', () => {
    expect(() => dataUrlToBlob('https://example.com/a.jpg')).toThrow();
  });
});

describe('the parked signup photo', () => {
  it('round-trips through storage and is scoped to one user', () => {
    stubLocalStorage();

    stashPendingAvatar('user-a', 'data:image/jpeg;base64,aGk=');

    expect(readPendingAvatar('user-a')).toBe('data:image/jpeg;base64,aGk=');
    expect(readPendingAvatar('user-b')).toBeNull();
  });

  it('is cleared once it has been applied', () => {
    stubLocalStorage();

    stashPendingAvatar('user-a', 'data:image/jpeg;base64,aGk=');
    clearPendingAvatar('user-a');

    expect(readPendingAvatar('user-a')).toBeNull();
  });

  /*
   * A 5MB photo is ~6.7MB base64, past the quota. The signup must still
   * complete: losing the photo is recoverable from Profile, losing the account
   * is not.
   */
  it('does not throw when storage refuses the write', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => { throw new Error('QuotaExceededError'); },
      removeItem: () => {},
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => stashPendingAvatar('user-a', 'data:image/jpeg;base64,aGk=')).not.toThrow();
  });

  it('reads as absent when there is no storage at all', () => {
    expect(readPendingAvatar('user-a')).toBeNull();
    expect(() => clearPendingAvatar('user-a')).not.toThrow();
  });
});
