import { describe, it, expect, vi, afterEach } from 'vitest';
import { loadOrReloadOnce } from './lazyWithReload';

/*
 * The guard here is the whole point: a chunk that 404s after a deploy should
 * cost one reload, and a chunk that is genuinely missing should cost exactly
 * one too and then surface as an error. Getting this wrong does not fail
 * quietly - it reloads the page forever.
 */

const stubBrowser = (opts: { lastReloadAt?: number; storageThrows?: boolean } = {}) => {
  const store = new Map<string, string>();
  if (opts.lastReloadAt !== undefined) {
    store.set('studysphere.chunkReloadAt', String(opts.lastReloadAt));
  }

  const reload = vi.fn();

  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => {
      if (opts.storageThrows) throw new Error('denied');
      return store.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      if (opts.storageThrows) throw new Error('denied');
      store.set(key, value);
    },
    removeItem: (key: string) => void store.delete(key),
  });

  vi.stubGlobal('window', { location: { reload } });

  return { reload, store };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadOrReloadOnce', () => {
  it('returns the module when the import works, without reloading', async () => {
    const { reload } = stubBrowser();

    await expect(loadOrReloadOnce(async () => 'the module')).resolves.toBe('the module');
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads when a chunk fails to load', async () => {
    const { reload } = stubBrowser();

    // Never settles, so there is nothing to await — the reload is the outcome.
    loadOrReloadOnce(async () => {
      throw new TypeError('Failed to fetch dynamically imported module');
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('records when it reloaded, so the next failure can tell', async () => {
    const { store } = stubBrowser();

    loadOrReloadOnce(async () => { throw new Error('boom'); });
    await Promise.resolve();
    await Promise.resolve();

    expect(Number(store.get('studysphere.chunkReloadAt'))).toBeGreaterThan(0);
  });

  /*
   * The one that matters. A reload that did not fix anything must not trigger
   * another: the error has to escape so the boundary can show it.
   */
  it('throws instead of reloading again when it just reloaded', async () => {
    const { reload } = stubBrowser({ lastReloadAt: Date.now() });

    await expect(
      loadOrReloadOnce(async () => { throw new Error('still missing'); })
    ).rejects.toThrow('still missing');

    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads again once the cooldown has passed, for a later deploy', async () => {
    const { reload } = stubBrowser({ lastReloadAt: Date.now() - 60_000 });

    loadOrReloadOnce(async () => { throw new Error('new deploy'); });
    await Promise.resolve();
    await Promise.resolve();

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('still reloads when sessionStorage is unavailable', async () => {
    const { reload } = stubBrowser({ storageThrows: true });

    loadOrReloadOnce(async () => { throw new Error('boom'); });
    await Promise.resolve();
    await Promise.resolve();

    expect(reload).toHaveBeenCalledTimes(1);
  });
});
