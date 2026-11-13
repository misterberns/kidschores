import { useEffect, useState } from 'react';
import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Delete, Lock, X } from 'lucide-react';
import { kioskApi, type KioskPendingClaim } from './kioskClient';

/** Lock the parent panel after this long without a touch. */
export const PARENT_IDLE_MS = 60_000;

const status = (err: unknown) => (axios.isAxiosError(err) ? err.response?.status : undefined);

function PinPad({ onUnlocked }: { onUnlocked: (ticket: string, name: string, expiresIn: number) => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const unlock = useMutation({
    mutationFn: (p: string) => kioskApi.unlock(p),
    meta: { suppressErrorToast: true },
    onSuccess: (r) => onUnlocked(r.ticket, r.parent_name, r.expires_in),
    onError: (err) => {
      setPin('');
      setError(
        status(err) === 429
          ? 'Too many wrong PINs. Wait a few minutes and try again.'
          : 'That PIN didn’t match a parent.',
      );
    },
  });
  const press = (d: string) => {
    setError(null);
    setPin((p) => (p.length < 8 ? p + d : p));
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-text-muted">Enter your parent PIN</p>
      <div data-testid="kiosk-pin-dots" className="flex gap-3 h-6" aria-label={`${pin.length} digits entered`}>
        {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
          <span
            key={i}
            className={`w-4 h-4 rounded-full border-2 border-[var(--primary-500)] ${i < pin.length ? 'bg-[var(--primary-500)]' : ''}`}
          />
        ))}
      </div>
      {error && <p role="alert" className="text-text-primary">{error}</p>}
      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            type="button"
            data-testid={`kiosk-pin-${d}`}
            onClick={() => press(d)}
            className="w-20 h-16 rounded-xl text-2xl font-bold text-text-primary border border-[var(--border-color)] bg-bg-base"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          aria-label="Delete last digit"
          onClick={() => setPin((p) => p.slice(0, -1))}
          className="w-20 h-16 rounded-xl flex items-center justify-center text-text-muted border border-[var(--border-color)] bg-bg-base"
        >
          <Delete size={22} />
        </button>
        <button
          type="button"
          data-testid="kiosk-pin-0"
          onClick={() => press('0')}
          className="w-20 h-16 rounded-xl text-2xl font-bold text-text-primary border border-[var(--border-color)] bg-bg-base"
        >
          0
        </button>
        <button
          type="button"
          data-testid="kiosk-pin-ok"
          aria-label="Unlock"
          disabled={pin.length < 4 || unlock.isPending}
          onClick={() => unlock.mutate(pin)}
          className="w-20 h-16 rounded-xl flex items-center justify-center font-bold text-[var(--text-inverse)] bg-[var(--primary-500)] disabled:opacity-50"
        >
          <Check size={24} />
        </button>
      </div>
    </div>
  );
}

function PendingList({ ticket, onExpired }: { ticket: string; onExpired: () => void }) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['kiosk-parent-pending', ticket],
    queryFn: () => kioskApi.pending(ticket),
    retry: false,
  });
  useEffect(() => {
    if (status(error) === 401) onExpired();
  }, [error, onExpired]);

  const decide = useMutation({
    mutationFn: ({ c, ok }: { c: KioskPendingClaim; ok: boolean }) =>
      ok ? kioskApi.approve(ticket, c.kid_id, c.chore_id) : kioskApi.reject(ticket, c.kid_id, c.chore_id),
    meta: { suppressErrorToast: true },
    onSettled: (_r, err) => {
      if (status(err) === 401) return onExpired();
      queryClient.invalidateQueries({ queryKey: ['kiosk-parent-pending'] });
      queryClient.invalidateQueries({ queryKey: ['kiosk-state'] });
    },
  });

  if (isLoading) return <p className="text-text-muted">Loading…</p>;
  if (!data || data.length === 0) {
    return <p data-testid="kiosk-parent-empty" className="text-lg text-text-muted py-6">Nothing waiting. All caught up!</p>;
  }
  return (
    <ul className="w-full divide-y divide-[var(--border-color)]" data-testid="kiosk-parent-pending">
      {data.map((c) => (
        <li key={`${c.kid_id}-${c.chore_id}`} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0 text-left">
            <p className="font-semibold text-text-primary truncate">{c.chore_name}</p>
            <p className="text-sm text-text-muted">{c.kid_name} · {c.points} points</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              data-testid={`kiosk-reject-${c.kid_id}-${c.chore_id}`}
              disabled={decide.isPending}
              onClick={() => decide.mutate({ c, ok: false })}
              className="px-4 py-3 rounded-xl font-semibold text-text-primary border border-[var(--border-color)] disabled:opacity-50"
            >
              Not yet
            </button>
            <button
              type="button"
              data-testid={`kiosk-approve-${c.kid_id}-${c.chore_id}`}
              disabled={decide.isPending}
              onClick={() => decide.mutate({ c, ok: true })}
              className="px-4 py-3 rounded-xl font-semibold text-[var(--text-inverse)] bg-[var(--primary-500)] disabled:opacity-50"
            >
              Approve
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Parent approval on the kiosk (v0.19.0). A PIN buys a 2-minute, device-bound ticket
 * that lives only in this component's state; the panel locks itself after a minute
 * without a touch or when the ticket expires, whichever comes first.
 */
export function ParentPanel({ pinSet, onClose }: { pinSet: boolean; onClose: () => void }) {
  const [session, setSession] = useState<{ ticket: string; name: string; until: number } | null>(null);
  const lock = () => setSession(null);

  useEffect(() => {
    if (!session) return;
    let idle = window.setTimeout(onClose, PARENT_IDLE_MS);
    const expiry = window.setTimeout(lock, Math.max(0, session.until - Date.now()));
    const reset = () => {
      window.clearTimeout(idle);
      idle = window.setTimeout(onClose, PARENT_IDLE_MS);
    };
    window.addEventListener('pointerdown', reset);
    return () => {
      window.clearTimeout(idle);
      window.clearTimeout(expiry);
      window.removeEventListener('pointerdown', reset);
    };
  }, [session, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" data-testid="kiosk-parent-panel">
      <div role="dialog" aria-modal="true" aria-labelledby="kiosk-parent-title" className="w-full max-w-lg max-h-[90dvh] overflow-y-auto p-6 rounded-2xl bg-bg-surface shadow-card text-center">
        <div className="flex items-center justify-between mb-4">
          <h2 id="kiosk-parent-title" className="text-2xl font-bold text-text-primary">
            {session ? `Hi, ${session.name}` : 'Parent'}
          </h2>
          <div className="flex gap-2">
            {session && (
              <button type="button" onClick={lock} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-text-muted border border-[var(--border-color)]">
                <Lock size={16} /> Lock
              </button>
            )}
            <button type="button" aria-label="Close" onClick={onClose} className="p-2 rounded-lg text-text-muted border border-[var(--border-color)]">
              <X size={18} />
            </button>
          </div>
        </div>
        {!pinSet ? (
          <p data-testid="kiosk-parent-no-pin" className="text-text-muted py-4">
            No parent has a PIN yet. Set one on your own phone or computer in Parent Dashboard, Parents tab, then approve here.
          </p>
        ) : session ? (
          <PendingList ticket={session.ticket} onExpired={lock} />
        ) : (
          <PinPad onUnlocked={(ticket, name, s) => setSession({ ticket, name, until: Date.now() + s * 1000 })} />
        )}
      </div>
    </div>
  );
}
