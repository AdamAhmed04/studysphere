import { lazy, type ComponentType } from 'react';

const RELOAD_KEY = 'studysphere.chunkReloadAt';

/*
 * Long enough that a reload which did not help cannot immediately trigger
 * another, short enough that a second deploy later in the same session is
 * still recovered from rather than shown as an error.
 */
const RELOAD_COOLDOWN_MS = 10_000;

const lastReloadAt = (): number => {
  try {
    return Number(sessionStorage.getItem(RELOAD_KEY)) || 0;
  } catch {
    // Private browsing. Treat it as never having reloaded; the cooldown is a
    // safety net, not a correctness requirement.
    return 0;
  }
};

const markReloaded = () => {
  try {
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // Nothing to record. Worst case is one extra reload.
  }
};

/**
 * `React.lazy`, but it survives a deploy.
 *
 * Every build gives each chunk a new content hash and the old files stop
 * being served. A browser that loaded the app before a deploy is still
 * running the previous main bundle, so the moment it lazy-loads a route it
 * asks for a filename that now 404s and the screen dies with "Failed to fetch
 * dynamically imported module" - on a page that worked a minute earlier.
 *
 * Reloading is the fix, because it fetches a fresh index.html and with it the
 * new chunk names. The cooldown is what keeps that honest: if the import
 * still fails after a reload the failure is real - offline, or a chunk that
 * genuinely is not there - and it is allowed to surface as an error rather
 * than reloading forever.
 */
/**
 * The retry itself, separated from `lazy` so it can be tested directly —
 * the loop guard is the part that must not be wrong.
 */
export async function loadOrReloadOnce<T>(factory: () => Promise<T>): Promise<T> {
  try {
    return await factory();
  } catch (error) {
    if (Date.now() - lastReloadAt() > RELOAD_COOLDOWN_MS) {
      markReloaded();
      window.location.reload();

      // Deliberately never settles. The reload is already underway, and
      // resolving or rejecting here would only render something over a page
      // that is about to be replaced.
      return new Promise<T>(() => {});
    }

    throw error;
  }
}

// Mirrors React's own `lazy` signature. Inferring from the props instead
// collapses them to `never` at every call site.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithReload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(() => loadOrReloadOnce(factory));
}
