/**
 * Header notification bell (v0.17.0).
 *
 * Role-SPLIT by design: the kid branch renders a plain settings link with ZERO
 * queries mounted anywhere in its tree — parent-only endpoints 403 kid sessions
 * and the kid-journey e2e asserts a zero-403 sweep. Hooks can't be conditional,
 * so the parent data lives in an internal component that only mounts for parents.
 *
 * Parent branch: pending-approvals count badge (same ['approvals-count'] query
 * key + 30s poll as the Admin tab — React Query dedupes them) and a dropdown
 * panel listing pending chore/reward claims by name (server-enriched — no
 * client-side joins) plus an allowance-payouts aggregate row. The badge total
 * deliberately equals the Admin "Approve" pill (payouts NOT included — they are
 * actioned on /allowance, not the approvals list).
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, ClipboardList, Gift, Settings, Wallet } from 'lucide-react';
import { allowanceApi, approvalsApi } from '../../api/client';
import { CountBadge } from '../AnimatedBadge';
import { ReportProblemButton } from '../feedback/ReportProblemButton';
import { VersionChip } from '../VersionChip';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const ICON_BUTTON_CLASSES =
  'relative p-2 rounded-lg hover:bg-bg-accent text-text-muted hover:text-primary-500 transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-500/40';

function relativeTime(iso: string): string {
  const then = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`).getTime();
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function ParentBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  const { data: count } = useQuery({
    queryKey: ['approvals-count'],
    queryFn: () => approvalsApi.count().then(res => res.data),
    refetchInterval: 30000,
  });

  const { data: pending } = useQuery({
    queryKey: ['approvals'],
    queryFn: () => approvalsApi.pending().then(res => res.data),
    enabled: open,
  });

  const { data: pendingPayouts = [] } = useQuery({
    queryKey: ['allowance-pending'],
    queryFn: () => allowanceApi.getAllPending().then(res => res.data),
    enabled: open,
  });

  // Close on Escape and on outside click/tap.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onPointer = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  const total = count?.total ?? 0;
  const pendingChores = pending?.chores ?? [];
  const pendingRewards = pending?.rewards ?? [];
  const goToApprovals = () => { setOpen(false); navigate('/admin'); };

  return (
    <div className="relative" ref={containerRef}>
      <button
        data-testid="bell-button"
        aria-label={total > 0 ? `Pending approvals: ${total}` : 'Notifications'}
        title="Notifications"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className={ICON_BUTTON_CLASSES}
      >
        <Bell size={18} />
        {total > 0 && (
          <span className="absolute -top-1 -right-1" data-testid="bell-badge">
            <CountBadge count={total} variant="warning" className="!min-w-5 !h-5 !text-[10px]" />
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Pending approvals"
            data-testid="bell-panel"
            // -right offset on phones: the bell sits ~2 controls in from the
            // viewport edge, so a right-0-anchored 320px panel clips off-screen
            // left at 420px width. Shift it toward the edge on small screens.
            className="card absolute -right-[4.5rem] sm:right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] max-h-96 overflow-y-auto z-50 p-3 shadow-xl"
            initial={prefersReducedMotion ? false : { opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          >
            <p className="text-sm font-bold text-text-primary px-1 pb-2">
              {total > 0 ? `Waiting for you (${total})` : 'All caught up!'}
            </p>

            {pendingChores.map(claim => (
              <button
                key={claim.id}
                onClick={goToApprovals}
                className="w-full text-left flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-bg-accent transition-colors"
              >
                <ClipboardList size={16} className="text-status-claimed-text mt-0.5 flex-shrink-0" />
                <span className="text-sm text-text-secondary min-w-0">
                  <strong className="text-text-primary">{claim.kid_name || 'A kid'}</strong>
                  {' claimed '}
                  <strong className="text-text-primary">{claim.chore_name || 'a chore'}</strong>
                  <span className="block text-xs text-text-muted">{relativeTime(claim.claimed_at)}</span>
                </span>
              </button>
            ))}

            {pendingRewards.map(claim => (
              <button
                key={claim.id}
                onClick={goToApprovals}
                className="w-full text-left flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-bg-accent transition-colors"
              >
                <Gift size={16} className="text-accent-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-text-secondary min-w-0">
                  <strong className="text-text-primary">{claim.kid_name || 'A kid'}</strong>
                  {' wants '}
                  <strong className="text-text-primary">{claim.reward_name || 'a reward'}</strong>
                  <span className="block text-xs text-text-muted">{relativeTime(claim.requested_at)}</span>
                </span>
              </button>
            ))}

            {pendingPayouts.length > 0 && (
              <Link
                to="/allowance"
                onClick={() => setOpen(false)}
                className="w-full text-left flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-bg-accent transition-colors"
                data-testid="bell-payouts-row"
              >
                <Wallet size={16} className="text-status-pending-text mt-0.5 flex-shrink-0" />
                <span className="text-sm text-text-secondary">
                  <strong className="text-text-primary">
                    {pendingPayouts.length} allowance payout{pendingPayouts.length === 1 ? '' : 's'}
                  </strong>{' '}
                  awaiting
                </span>
              </Link>
            )}

            {total > 0 && (
              <button
                onClick={goToApprovals}
                className="w-full mt-1 btn btn-primary text-sm"
                data-testid="bell-view-all"
              >
                View all approvals
              </button>
            )}

            <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-bg-accent px-1">
              <Link
                to="/notifications"
                onClick={() => setOpen(false)}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-primary-500 transition-colors"
              >
                <Settings size={12} />
                Notification settings
              </Link>
              <div className="flex items-center gap-2">
                <ReportProblemButton compact />
                <VersionChip />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function NotificationBell({ role }: { role: 'parent' | 'kid' }) {
  if (role === 'kid') {
    // Plain settings link — no queries mount in this branch (zero-403 invariant).
    return (
      <Link
        to="/notifications"
        aria-label="Notification settings"
        title="Notification settings"
        className={ICON_BUTTON_CLASSES}
      >
        <Bell size={18} />
      </Link>
    );
  }
  return <ParentBell />;
}
