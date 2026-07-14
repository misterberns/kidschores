import { useCallback, useSyncExternalStore } from 'react';
import {
  consumeDeferredPrompt,
  getDeferredPrompt,
  subscribeInstallPrompt,
  wasAppInstalled,
} from '../installPromptStore';

/**
 * A2HS (add-to-home-screen) install state. Ported from the Card Atlas
 * v2.1.42 hook — same two install worlds:
 *
 * - Chromium (Android/desktop) fires `beforeinstallprompt`; we stash it and
 *   can trigger the NATIVE install prompt on demand (`promptInstall`).
 * - iOS Safari has NO install API/event — install is the manual Share →
 *   "Add to Home Screen" flow, so callers render GUIDANCE when `isIOS` and
 *   not already installed.
 */


export interface InstallAppState {
  /** Already running as an installed app (standalone display-mode). */
  isStandalone: boolean;
  /** iOS/iPadOS device (incl. iPadOS masquerading as macOS w/ touch). */
  isIOS: boolean;
  /** A native install prompt is available (Chromium captured the event). */
  canPromptInstall: boolean;
  /** Trigger the native prompt. Resolves true if the user accepted. */
  promptInstall: () => Promise<boolean>;
}

export function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
    // Legacy iOS Safari signal (set only in an installed web app).
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ reports as "MacIntel" but has a touchscreen.
  return navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1;
}

export function useInstallApp(): InstallAppState {
  // Card Atlas v2.2.6 pattern: read the module-scope stash (captured in the
  // entry chunk) instead of registering a too-late listener here —
  // beforeinstallprompt is one-shot and fires long before lazy consumers mount.
  const deferred = useSyncExternalStore(subscribeInstallPrompt, getDeferredPrompt, () => null);
  const installedThisLoad = useSyncExternalStore(subscribeInstallPrompt, wasAppInstalled, () => false);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    const ev = getDeferredPrompt();
    if (!ev) return false;
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    consumeDeferredPrompt(); // the stashed event is single-use
    return outcome === 'accepted';
  }, []);

  return {
    isStandalone: detectStandalone() || installedThisLoad,
    isIOS: detectIOS(),
    canPromptInstall: deferred !== null,
    promptInstall,
  };
}
