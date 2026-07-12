import { Download, Share, Smartphone } from 'lucide-react';
import { useInstallApp } from '../hooks/useInstallApp';

/**
 * "Install the app" card (Help page). Three states:
 *  - already installed (standalone) → renders nothing
 *  - Chromium captured beforeinstallprompt → native install button
 *  - iOS (no install API) → numbered Add-to-Home-Screen guidance
 *  - otherwise → generic pointer at the browser menu's "Install app"
 */
export function InstallAppCard() {
  const { isStandalone, isIOS, canPromptInstall, promptInstall } = useInstallApp();

  if (isStandalone) return null;

  return (
    <div className="card mb-6" data-testid="install-app-card">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2.5 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
          <Smartphone size={22} className="text-primary-500" />
        </div>
        <div>
          <h2 className="font-bold text-text-primary">Install the app</h2>
          <p className="text-sm text-text-secondary">
            Add KidsChores to your home screen — it opens full-screen like a real app.
          </p>
        </div>
      </div>

      {canPromptInstall ? (
        <button
          type="button"
          onClick={() => void promptInstall()}
          className="btn btn-primary w-full"
          data-testid="install-app-button"
        >
          <Download size={18} />
          Install KidsChores
        </button>
      ) : isIOS ? (
        <ol className="list-decimal list-inside space-y-1.5 text-sm text-text-secondary">
          <li>
            Open this page in <strong>Safari</strong>
          </li>
          <li>
            Tap the <Share size={14} className="inline -mt-0.5" aria-hidden="true" />{' '}
            <strong>Share</strong> button
          </li>
          <li>
            Choose <strong>Add to Home Screen</strong>
          </li>
          <li>Open KidsChores from your Home Screen</li>
        </ol>
      ) : (
        <p className="text-sm text-text-secondary">
          In Chrome, open the <strong>⋮ menu</strong> and choose{' '}
          <strong>Install app</strong> (or "Add to Home screen").
        </p>
      )}
    </div>
  );
}

export default InstallAppCard;
