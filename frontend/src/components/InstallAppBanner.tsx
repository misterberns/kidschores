import { useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { useInstallApp } from '../hooks/useInstallApp';

/**
 * Compact, dismissible "install the app" banner for the TOP of Home — the
 * page every session (kid or parent) lands on. This is the kid-discoverable
 * install surface (v0.14.2): the fuller InstallAppCard lives on the Help
 * page, which only parents can reach.
 *
 * Hidden when already installed (standalone). Dismissal is per-device and
 * re-surfaces after 14 days so it nudges without nagging.
 */

const DISMISS_KEY = 'kidschores-install-banner-dismissed-at';
const DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export function isBannerDismissed(now: number = Date.now()): boolean {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return false;
  return now - ts < DISMISS_TTL_MS;
}

export function InstallAppBanner() {
  const { isStandalone, isIOS, canPromptInstall, promptInstall } = useInstallApp();
  const [dismissed, setDismissed] = useState(isBannerDismissed);
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  if (isStandalone || dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  return (
    <div
      className="card mb-4 p-3 flex flex-col gap-2"
      data-testid="install-app-banner"
      role="region"
      aria-label="Install the app"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg shrink-0">
          <Smartphone size={18} className="text-primary-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-text-primary">Get the KidsChores app</p>
          <p className="text-xs text-text-secondary truncate">
            Add it to your home screen — opens like a real app
          </p>
        </div>
        {canPromptInstall ? (
          <button
            type="button"
            onClick={() => void promptInstall()}
            className="btn btn-primary shrink-0 !py-1.5 !px-3 text-sm"
            data-testid="install-banner-button"
          >
            <Download size={16} />
            Install
          </button>
        ) : isIOS ? (
          <button
            type="button"
            onClick={() => setShowIOSSteps((v) => !v)}
            className="btn btn-primary shrink-0 !py-1.5 !px-3 text-sm"
            data-testid="install-banner-how"
            aria-expanded={showIOSSteps}
          >
            How?
          </button>
        ) : null}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install banner"
          data-testid="install-banner-dismiss"
          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-accent transition-colors shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      {canPromptInstall ? null : isIOS ? (
        showIOSSteps && (
          <ol className="list-decimal list-inside space-y-1 text-xs text-text-secondary pl-1">
            <li>
              Open this page in <strong>Safari</strong>
            </li>
            <li>
              Tap the <Share size={12} className="inline -mt-0.5" aria-hidden="true" />{' '}
              <strong>Share</strong> button
            </li>
            <li>
              Choose <strong>Add to Home Screen</strong>
            </li>
          </ol>
        )
      ) : (
        <p className="text-xs text-text-secondary">
          Open the browser's <strong>⋮ menu</strong> and choose <strong>Install app</strong> (or
          "Add to Home screen").
        </p>
      )}
    </div>
  );
}

export default InstallAppBanner;
