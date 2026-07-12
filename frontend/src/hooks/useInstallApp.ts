import { useCallback, useEffect, useState } from 'react';

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

// Chromium-only event; not in lib.dom. Minimal shape we use.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

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
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(detectStandalone);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // suppress Chrome's mini-infobar; we prompt on demand
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setIsStandalone(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null); // the stashed event is single-use
    return outcome === 'accepted';
  }, [deferred]);

  return {
    isStandalone,
    isIOS: detectIOS(),
    canPromptInstall: deferred !== null,
    promptInstall,
  };
}
