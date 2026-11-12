import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Tablet, MonitorSmartphone, Trash2 } from 'lucide-react';
import { kioskDevicesApi } from '../../api/client';
import type { KioskDevice } from '../../api/client';
import { useAuth } from '../../auth';
import { setKioskToken } from '../../kiosk/kioskClient';
import { FormInput } from './FormElements';
import { DeleteConfirmModal } from './DeleteConfirmModal';

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
