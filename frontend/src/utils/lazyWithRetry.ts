import { lazy } from 'react';

/**
 * React.lazy with a stale-chunk recovery reload (ported from Card Atlas).
 *
 * nginx serves /assets immutable-1y with hashed filenames, so after a deploy
 * an already-open tab's next route navigation requests a chunk hash that no
 * longer exists -> the dynamic import rejects. Reloading once fetches the new
 * index.html (no-cache) and with it the fresh chunk graph.
 *
 * The retry is capped per-chunk via sessionStorage so a genuinely-missing
 * chunk (bad deploy) does NOT reload-loop: on a second failure we re-throw so
 * the top-level ErrorBoundary renders instead of reloading forever.
 */
export function lazyWithRetry(factory: () => Promise<{ default: React.ComponentType<unknown> }>) {
  return lazy(() =>
    factory().catch((err) => {
      const key = `kc:chunk-retry:${factory.toString()}`;
      let reloadedOnce = false;
      try {
        reloadedOnce = sessionStorage.getItem(key) === '1';
      } catch {
        // storage blocked (e.g. private mode) — degrade to reload-once-no-persist
      }
      if (reloadedOnce) throw err;
      try {
        sessionStorage.setItem(key, '1');
      } catch {
        /* ignore */
      }
      window.location.reload();
      return new Promise<{ default: React.ComponentType<unknown> }>(() => {}); // never resolves; page reloads
    })
  );
}
