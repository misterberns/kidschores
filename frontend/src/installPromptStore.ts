/**
 * Module-scope stash for Chromium's `beforeinstallprompt` (Card Atlas v2.2.6
 * pattern, ported back).
 *
 * The event is ONE-SHOT and fires early in page load. v0.13.0 registered its
 * listener inside the `useInstallApp` hook, which only mounted with the Help
 * page — by then the event had already fired and was lost, so the native
 * "Install" button never rendered and the card degraded to menu guidance.
 * This module registers the listener at IMPORT time and is imported by
 * `main.tsx` (the entry chunk), so the stash wins the race no matter when a
 * consumer mounts. `useInstallApp` reads/subscribes to it.
 */

// Chromium-only event; not in lib.dom. Minimal shape we use.
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // suppress Chrome's mini-infobar; we prompt on demand
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installed = true;
    notify();
  });
}

/** The stashed prompt event, or null if it hasn't fired / was consumed. */
export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  return deferred;
}

/** True once `appinstalled` fired this page load. */
export function wasAppInstalled(): boolean {
  return installed;
}

/** The stashed event is single-use — clear it after prompting. */
export function consumeDeferredPrompt(): void {
  deferred = null;
  notify();
}

/** Subscribe to stash changes (useSyncExternalStore contract). */
export function subscribeInstallPrompt(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** TEST-ONLY: reset module state between tests. */
export function resetInstallPromptStoreForTests(): void {
  deferred = null;
  installed = false;
  notify();
}
