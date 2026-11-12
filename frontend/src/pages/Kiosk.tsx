import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, Clock, Maximize, Power, Star } from 'lucide-react';
import { Logo } from '../components/Logo';
import { KidAvatar } from '../components/KidAvatar';
import { DynamicIcon } from '../components/DynamicIcon';
import { Confetti } from '../components/celebrations';
import type { TodaysChore } from '../api/client';
import axios from 'axios';
import {
  clearKioskToken,
  getKioskToken,
  setKioskToken,
  isKioskAuthError,
  kioskApi,
  type KioskKid,
} from '../kiosk/kioskClient';

/** Back to the picker after this long without a touch on a kid's screen. */
export const KIOSK_IDLE_MS = 60_000;
/** How long the exit control must be held. */
export const KIOSK_EXIT_HOLD_MS = 2_000;
const REFRESH_MS = 30_000;

const STATUS_ORDER: Record<string, number> = { pending: 0, claimed: 1, approved: 2 };

function sortChores(chores: TodaysChore[]): TodaysChore[] {
  return [...chores].sort(
    (a, b) => (STATUS_ORDER[a.status ?? 'pending'] ?? 3) - (STATUS_ORDER[b.status ?? 'pending'] ?? 3),
  );
}

function leaveKiosk() {
  clearKioskToken();
  window.location.assign('/login');
}

/** Keep the tablet's screen on while the kiosk is showing (where supported). */
function useWakeLock() {
  useEffect(() => {
    type Sentinel = { release: () => Promise<void> };
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<Sentinel> } };
    if (!nav.wakeLock) return;
    let sentinel: Sentinel | null = null;
    const acquire = () => {
      if (document.visibilityState !== 'visible') return;
      nav.wakeLock!.request('screen').then((s) => { sentinel = s; }).catch(() => { /* denied: fine */ });
    };
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      document.removeEventListener('visibilitychange', acquire);
      sentinel?.release().catch(() => {});
    };
  }, []);
}

/** Calls `onIdle` after `ms` without a pointer or key event, while `active`. */
function useIdleReturn(active: boolean, ms: number, onIdle: () => void) {
  useEffect(() => {
    if (!active) return;
    let timer = window.setTimeout(onIdle, ms);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(onIdle, ms);
    };
    window.addEventListener('pointerdown', reset);
    window.addEventListener('keydown', reset);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', reset);
      window.removeEventListener('keydown', reset);
    };
  }, [active, ms, onIdle]);
}

function ConfirmExit({ onStay }: { onStay: () => void }) {
  const [leaving, setLeaving] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50" data-testid="kiosk-exit-confirm">
      <div role="dialog" aria-modal="true" aria-labelledby="kiosk-exit-title" className="w-full max-w-md p-6 rounded-2xl bg-bg-surface shadow-card text-center">
        <h2 id="kiosk-exit-title" className="text-2xl font-bold text-text-primary">Turn off kiosk mode?</h2>
        <p className="mt-2 text-text-muted">A parent will need to sign in to set this tablet up again.</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" onClick={onStay} autoFocus className="py-4 rounded-xl text-lg font-semibold text-[var(--text-inverse)] bg-[var(--primary-500)]">
            Keep kiosk
          </button>
          <button
            type="button"
            data-testid="kiosk-exit-yes"
            disabled={leaving}
            onClick={() => {
              setLeaving(true);
              kioskApi.endSession().catch(() => { /* already revoked or offline: leave anyway */ }).finally(leaveKiosk);
            }}
            className="py-4 rounded-xl text-lg font-semibold text-text-primary border border-[var(--border-color)]"
          >
            Turn off
          </button>
        </div>
      </div>
    </div>
  );
}

function HoldToExit() {
  const [holding, setHolding] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const timer = useRef<number | null>(null);

  const cancel = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  };
  const start = () => {
    setHolding(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setHolding(false);
      setConfirming(true);
    }, KIOSK_EXIT_HOLD_MS);
  };
  useEffect(() => cancel, []);

  return (
    <>
    {confirming && <ConfirmExit onStay={() => setConfirming(false)} />}
    <button
      type="button"
      data-testid="kiosk-exit"
      aria-label="Hold for 2 seconds to exit kiosk mode"
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      className="relative overflow-hidden whitespace-nowrap flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-muted border border-[var(--border-color)] bg-bg-surface select-none"
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-[var(--primary-500)] opacity-25"
        style={{
          width: holding ? '100%' : '0%',
          transition: holding ? `width ${KIOSK_EXIT_HOLD_MS}ms linear` : 'none',
        }}
      />
      <Power size={16} className="relative" />
      <span className="relative">{holding ? 'Keep holding…' : 'Hold to exit'}</span>
    </button>
    </>
  );
}

function FullscreenButton() {
  if (typeof document === 'undefined' || !document.fullscreenEnabled) return null;
  return (
    <button
      type="button"
      aria-label="Full screen"
      onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
      className="whitespace-nowrap flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-muted border border-[var(--border-color)] bg-bg-surface"
    >
      <Maximize size={16} />
      <span className="hidden sm:inline">Full screen</span>
    </button>
  );
}

function NotSetUp({ revoked, onPaired }: { revoked: boolean; onPaired: (token: string) => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const pair = useMutation({
    mutationFn: (c: string) => kioskApi.pair(c),
    meta: { suppressErrorToast: true }, // the kiosk shows its own inline message
    onSuccess: (device) => {
      setKioskToken(device.token);
      onPaired(device.token);
    },
    onError: (err) => {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      setError(
        status === 429
          ? 'Too many wrong codes. Wait a few minutes and try again.'
          : 'That code isn’t valid or has expired. Ask a parent for a new one.',
      );
    },
  });

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 p-6 bg-bg-base text-center">
      <Logo variant="icon" size={56} />
      <h1 className="text-2xl font-bold text-text-primary">
        {revoked ? 'This kiosk was turned off' : 'This device is not a kiosk yet'}
      </h1>
      <p className="text-text-muted max-w-md">
        On your own phone or computer, open Parent Dashboard, Kiosk tab, and tap “Pair a device”. Then type
        the code here.
      </p>
      <form
        className="w-full max-w-sm flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          pair.mutate(code);
        }}
      >
        <label htmlFor="kiosk-pair-code" className="sr-only">Pairing code</label>
        <input
          id="kiosk-pair-code"
          data-testid="kiosk-pair-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="XXXX-XXXX"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={12}
          className="w-full text-center text-3xl tracking-widest font-bold py-4 rounded-xl border border-[var(--border-color)] bg-bg-surface text-text-primary focus:outline-none focus:border-[var(--primary-500)]"
        />
        {error && (
          <p role="alert" className="text-text-primary">{error}</p>
        )}
        <button
          type="submit"
          data-testid="kiosk-pair-submit"
          disabled={pair.isPending || code.replace(/[^A-Za-z0-9]/g, '').length < 8}
          className="py-4 rounded-xl text-lg font-semibold text-[var(--text-inverse)] bg-[var(--primary-500)] disabled:opacity-50"
        >
          {pair.isPending ? 'Pairing…' : 'Pair this device'}
        </button>
      </form>
      <button type="button" onClick={leaveKiosk} className="mt-2 text-sm text-text-muted underline">
        Parent sign in instead
      </button>
    </div>
  );
}

function KidPicker({ kids, onPick }: { kids: KioskKid[]; onPick: (id: string) => void }) {
  if (kids.length === 0) {
    return <p className="text-center text-text-muted text-lg">No kids have been added yet.</p>;
  }
  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4 w-full max-w-5xl">
      {kids.map((kid) => {
        const left = kid.chores.filter((c) => (c.status ?? 'pending') === 'pending').length;
        return (
          <motion.button
            key={kid.id}
            type="button"
            data-testid={`kiosk-kid-${kid.id}`}
            whileTap={{ scale: 0.96 }}
            onClick={() => onPick(kid.id)}
            className="flex flex-col items-center gap-2 p-6 sm:p-8 rounded-2xl border border-[var(--border-color)] bg-bg-surface shadow-card"
          >
            <KidAvatar kidId={kid.id} kidName={kid.name} size="lg" />
            <span className="text-xl sm:text-2xl font-bold text-text-primary">{kid.name}</span>
            <span className="text-text-muted">
              {kid.chores.length === 0
                ? 'No chores today'
                : left === 0
                  ? 'All done today'
                  : `${left} chore${left === 1 ? '' : 's'} to do`}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

function ChoreTile({
  chore,
  onClaim,
  busy,
}: {
  chore: TodaysChore;
  onClaim: () => void;
  busy: boolean;
}) {
  const status = chore.status ?? 'pending';
  const base = 'flex flex-col items-center justify-center gap-2 p-5 min-h-[160px] rounded-2xl border text-center';
  const body = (
    <>
      <DynamicIcon icon={chore.icon} size={44} />
      <span className="text-lg sm:text-xl font-semibold text-text-primary">{chore.name}</span>
      <span className="flex items-center gap-1 text-text-muted">
        <Star size={16} /> {chore.default_points} points
      </span>
    </>
  );

  if (status === 'pending') {
    return (
      <motion.button
        type="button"
        data-testid={`kiosk-chore-${chore.id}`}
        whileTap={{ scale: 0.96 }}
        disabled={busy}
        onClick={onClaim}
        className={`${base} border-[var(--primary-500)] bg-bg-surface shadow-card disabled:opacity-60`}
      >
        {body}
        <span className="mt-1 px-4 py-2 rounded-full text-sm font-bold text-[var(--text-inverse)] bg-[var(--primary-500)]">
          I did it!
        </span>
      </motion.button>
    );
  }
  return (
    <div data-testid={`kiosk-chore-${chore.id}`} className={`${base} border-[var(--border-color)] bg-bg-surface opacity-80`}>
      {body}
      <span className="mt-1 flex items-center gap-1 px-4 py-2 rounded-full text-sm font-semibold text-text-primary bg-bg-base">
        {status === 'approved' ? <><Check size={16} /> Done</> : <><Clock size={16} /> Waiting for a parent</>}
      </span>
    </div>
  );
}

export function Kiosk() {
  const [token, setToken] = useState(getKioskToken);
  const [kidId, setKidId] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  useWakeLock();

  const { data, isLoading, error: loadError } = useQuery({
    queryKey: ['kiosk-state'],
    queryFn: kioskApi.state,
    enabled: !!token,
    refetchInterval: REFRESH_MS,
    retry: (count, err) => !isKioskAuthError(err) && count < 2,
  });

  const backToPicker = useCallback(() => {
    setKidId(null);
    setError(null);
  }, []);
  useIdleReturn(kidId !== null, KIOSK_IDLE_MS, backToPicker);

  const claim = useMutation({
    mutationFn: ({ kid, chore }: { kid: KioskKid; chore: TodaysChore }) => kioskApi.claim(kid.id, chore.id),
    meta: { suppressErrorToast: true }, // the kiosk shows its own inline message
    onSuccess: (_res, { kid }) => {
      setError(null);
      setCelebrate(kid.name);
      queryClient.invalidateQueries({ queryKey: ['kiosk-state'] });
    },
    onError: (err) => {
      if (isKioskAuthError(err)) {
        queryClient.invalidateQueries({ queryKey: ['kiosk-state'] });
        return;
      }
      setError('That one did not go through. Try again, or ask a parent.');
      queryClient.invalidateQueries({ queryKey: ['kiosk-state'] });
    },
  });

  useEffect(() => {
    if (!celebrate) return;
    const t = window.setTimeout(() => setCelebrate(null), 2600);
    return () => window.clearTimeout(t);
  }, [celebrate]);

  const revoked = isKioskAuthError(loadError);
  useEffect(() => {
    if (revoked) clearKioskToken();
  }, [revoked]);

  if (!token || revoked) {
    return (
      <NotSetUp
        revoked={revoked && !!token}
        onPaired={(t) => {
          // Drop the old 401 so the fresh token is not read as revoked.
          queryClient.removeQueries({ queryKey: ['kiosk-state'] });
          setToken(t);
        }}
      />
    );
  }

  const kid = data?.kids.find((k) => k.id === kidId) ?? null;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-bg-base" data-testid="kiosk">
      <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
        {kid ? (
          <button
            type="button"
            onClick={backToPicker}
            data-testid="kiosk-back"
            className="whitespace-nowrap flex items-center gap-2 px-4 py-3 rounded-xl text-lg font-semibold text-text-primary border border-[var(--border-color)] bg-bg-surface"
          >
            <ArrowLeft size={22} /> <span className="hidden sm:inline">Pick someone else</span><span className="sm:hidden">Back</span>
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <Logo variant="icon" size={36} />
            <span className="text-lg font-bold text-text-primary">KidsChores</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <FullscreenButton />
          <HoldToExit />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 pb-8">
        {isLoading && !data ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data ? (
          <p className="mt-16 text-lg text-text-muted">Can’t reach KidsChores right now. Retrying…</p>
        ) : kid ? (
          <div className="w-full max-w-6xl">
            <div className="flex items-center gap-4 mb-6">
              <KidAvatar kidId={kid.id} kidName={kid.name} size="lg" />
              <div>
                <h1 className="text-3xl font-bold text-text-primary">{kid.name}’s chores</h1>
                <p className="text-text-muted text-lg">{Math.round(kid.points)} points</p>
              </div>
            </div>
            {error && (
              <p role="alert" className="mb-4 p-3 rounded-xl border border-[var(--border-color)] bg-bg-surface text-text-primary">
                {error}
              </p>
            )}
            {kid.chores.length === 0 ? (
              <p className="text-lg text-text-muted">No chores today. Enjoy your day!</p>
            ) : (
              <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {sortChores(kid.chores).map((chore) => (
                  <ChoreTile
                    key={chore.id}
                    chore={chore}
                    busy={claim.isPending}
                    onClaim={() => claim.mutate({ kid, chore })}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 w-full flex flex-col items-center justify-center pb-[8vh]">
            <h1 className="mb-8 text-3xl sm:text-4xl font-bold text-text-primary text-center">Who’s doing chores?</h1>
            <KidPicker kids={data.kids} onPick={setKidId} />
          </div>
        )}
      </main>

      <Confetti show={celebrate !== null} />
      <AnimatePresence>
        {celebrate && (
          <motion.div
            role="status"
            data-testid="kiosk-celebration"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-x-0 top-1/3 mx-auto w-fit max-w-[90vw] px-8 py-6 rounded-2xl bg-bg-surface shadow-card border border-[var(--border-color)] text-center pointer-events-none"
          >
            <p className="text-3xl font-bold text-text-primary">Nice work, {celebrate}!</p>
            <p className="mt-2 text-lg text-text-muted">A parent will check it soon.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Kiosk;
