/**
 * Frontend error monitoring (UX-REVIEW / ROADMAP Tier 1 observability).
 *
 * - Global `error` / `unhandledrejection` handlers always run.
 * - Sentry activates ONLY when VITE_SENTRY_DSN is set at build time, and is
 *   loaded via dynamic import so it costs nothing in the main bundle when off.
 */

type SentryModule = typeof import('@sentry/react');

let sentry: Promise<SentryModule | null> | null = null;

export function reportError(err: unknown, context?: Record<string, unknown>) {
  // Always keep the console signal (previously errors were swallowed silently)
  console.error('[monitoring]', err, context ?? '');
  sentry?.then(S => {
    if (!S) return;
    S.captureException(err instanceof Error ? err : new Error(String(err)), {
      extra: context,
    });
  });
}

export function initMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (dsn) {
    sentry = import('@sentry/react')
      .then(S => {
        S.init({
          dsn,
          environment: import.meta.env.MODE,
          sendDefaultPii: false,
        });
        return S;
      })
      .catch(e => {
        console.warn('[monitoring] Sentry failed to load:', e);
        return null;
      });
  }

  window.addEventListener('error', event => {
    reportError(event.error ?? event.message, { source: 'window.onerror' });
  });
  window.addEventListener('unhandledrejection', event => {
    reportError(event.reason, { source: 'unhandledrejection' });
  });
}
