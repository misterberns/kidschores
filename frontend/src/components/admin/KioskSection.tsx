import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Tablet, MonitorSmartphone, Trash2, KeyRound } from 'lucide-react';
import { kioskDevicesApi } from '../../api/client';
import type { KioskDevice } from '../../api/client';
import { useAuth } from '../../auth';
import { setKioskToken } from '../../kiosk/kioskClient';
import { FormInput } from './FormElements';
import { DeleteConfirmModal } from './DeleteConfirmModal';

/** The one-time code a device types in, with a live countdown (v0.18.2). */
function PairingPanel() {
  const [name, setName] = useState('Tablet');
  const [pairing, setPairing] = useState<{ name: string; code: string; expires_at: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (deviceName: string) => kioskDevicesApi.createPairing(deviceName).then((r) => r.data),
    onSuccess: setPairing,
  });

  useEffect(() => {
    if (!pairing) return;
    const t = window.setInterval(() => {
      setNow(Date.now());
      // The device list gains a row once the code is used; keep it fresh meanwhile.
      queryClient.invalidateQueries({ queryKey: ['kiosk-devices'] });
    }, 5000);
    return () => window.clearInterval(t);
  }, [pairing, queryClient]);

  const msLeft = pairing ? new Date(pairing.expires_at).getTime() - now : 0;
  const expired = pairing !== null && msLeft <= 0;

  return (
    <div className="card p-4" data-testid="kiosk-pairing">
      <h3 className="font-bold text-lg mb-1 text-text-primary flex items-center gap-2">
        <KeyRound size={20} className="text-primary-500" /> Pair a device with a code
      </h3>
      <p className="text-text-secondary mb-4">
        For a tablet where you don’t want to sign in, or where sign-in can’t work, such as KidsChores shown
        inside a Home Assistant dashboard. Get a code here, then on the tablet tap “Enter a pairing code” on
        the sign-in screen and type it in. Codes work once and expire after 10 minutes.
      </p>
      {pairing && !expired ? (
        <div className="text-center">
          <p className="text-sm text-text-muted">Code for {pairing.name}</p>
          <p data-testid="kiosk-pairing-code" className="my-2 text-4xl font-bold tracking-widest text-text-primary select-all">
            {pairing.code}
          </p>
          <p className="text-sm text-text-muted">
            Expires in {Math.max(1, Math.ceil(msLeft / 60000))} min
          </p>
          <button type="button" className="btn btn-secondary mt-3" onClick={() => setPairing(null)}>
            Done
          </button>
        </div>
      ) : (
        <>
          {expired && <p className="mb-3 text-text-primary">That code expired. Get a new one.</p>}
          <FormInput
            label="Device name"
            aria-label="Paired device name"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tablet"
          />
          <button
            type="button"
            data-testid="kiosk-pairing-btn"
            className="btn btn-primary w-full sm:w-auto"
            disabled={create.isPending || !name.trim()}
            onClick={() => create.mutate(name.trim())}
          >
            <KeyRound size={18} />
            {create.isPending ? 'Getting a code…' : 'Pair a device'}
          </button>
        </>
      )}
    </div>
  );
}

function formatWhen(iso?: string | null): string {
  if (!iso) return 'never';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'unknown' : d.toLocaleString();
}

/**
 * Kiosk devices (v0.18.0). "Start kiosk on this device" mints a claim-only token,
 * keeps it on THIS browser, signs the parent out and opens /kiosk, so the shared
 * tablet never holds a parent session. Existing devices are listed and revocable.
 */
export function KioskSection() {
  const [name, setName] = useState('Kitchen tablet');
  const [removing, setRemoving] = useState<KioskDevice | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ['kiosk-devices'],
    queryFn: () => kioskDevicesApi.list().then((r) => r.data),
  });

  const start = useMutation({
    mutationFn: (deviceName: string) => kioskDevicesApi.create(deviceName).then((r) => r.data),
    onSuccess: (device) => {
      setKioskToken(device.token);
      logout();
      navigate('/kiosk', { replace: true });
    },
  });

  const revoke = useMutation({
    mutationFn: (id: string) => kioskDevicesApi.revoke(id),
    onSuccess: () => {
      setRemoving(null);
      queryClient.invalidateQueries({ queryKey: ['kiosk-devices'] });
    },
  });

  return (
    <div className="space-y-4" data-testid="kiosk-section">
      <div className="card p-4">
        <h3 className="font-bold text-lg mb-1 text-text-primary flex items-center gap-2">
          <Tablet size={20} className="text-primary-500" /> Shared tablet (kiosk mode)
        </h3>
        <p className="text-text-secondary mb-4">
          Turns this device into a family chore board: kids pick their name, see today’s chores in big
          buttons and tap the ones they finished. It can only mark chores as done. It can’t approve
          chores, spend points or change settings. You’ll be signed out on this device.
        </p>
        <FormInput
          label="Device name"
          aria-label="Device name"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          placeholder="Kitchen tablet"
        />
        <button
          type="button"
          data-testid="start-kiosk-btn"
          className="btn btn-primary w-full sm:w-auto"
          disabled={start.isPending || !name.trim()}
          onClick={() => start.mutate(name.trim())}
        >
          <MonitorSmartphone size={18} />
          {start.isPending ? 'Starting…' : 'Start kiosk on this device'}
        </button>
      </div>

      <PairingPanel />

      <div className="card p-4">
        <h3 className="font-bold text-lg mb-3 text-text-primary">Kiosk devices</h3>
        {isLoading ? (
          <p className="text-text-muted">Loading…</p>
        ) : devices.length === 0 ? (
          <p className="text-text-muted" data-testid="kiosk-devices-empty">No kiosk devices yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--border-color)]">
            {devices.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-3" data-testid="kiosk-device-row">
                <div className="min-w-0">
                  <p className="font-semibold text-text-primary truncate">{d.name}</p>
                  <p className="text-sm text-text-muted">
                    Added {formatWhen(d.created_at)} · last used {formatWhen(d.last_used)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${d.name}`}
                  onClick={() => setRemoving(d)}
                  className="p-2 rounded-lg text-text-muted hover:text-error-500"
                >
                  <Trash2 size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {removing && (
        <DeleteConfirmModal
          itemName={removing.name}
          isPending={revoke.isPending}
          onCancel={() => setRemoving(null)}
          onConfirm={() => revoke.mutate(removing.id)}
        />
      )}
    </div>
  );
}
