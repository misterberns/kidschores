import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Gift, Zap } from 'lucide-react';
import { kidsApi } from '../api/client';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface DailyProgressProps {
  kidId: string;
  compact?: boolean;
}

export function DailyProgress({ kidId, compact = false }: DailyProgressProps) {
  const prefersReducedMotion = useReducedMotion();

  const { data: progress, isLoading } = useQuery({
    queryKey: ['daily-progress', kidId],
    queryFn: () => kidsApi.getDailyProgress(kidId).then(res => res.data),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading || !progress) {
    return (
      <div className="rounded-xl p-3 bg-bg-accent animate-pulse">
        <div className="h-4 bg-bg-surface rounded w-24 mb-2" />
        <div className="h-2 bg-bg-surface rounded w-full" />
      </div>
    );
  }

  const { total_chores, completed_chores, completion_percentage, all_completed, bonus_eligible, bonus_awarded, bonus_points, multiplier } = progress;

  if (total_chores === 0) {
    return null; // No recurring chores for today
  }

  if (compact) {
    // Conic ring progress in the kid's accent (C's ring treatment)
    return (
      <div className="flex items-center gap-3">
        <div
          className="ring-progress w-11 h-11"
          style={{
            '--ring-pct': completion_percentage,
            '--ring-color': all_completed
              ? 'var(--status-approved-border)'
              : 'var(--kid-accent, var(--primary-500))',
          } as React.CSSProperties}
          role="img"
          aria-label={`${completed_chores} of ${total_chores} chores done today`}
        >
          <span className="stat-number text-[11px] font-bold text-text-primary">
            {completed_chores}/{total_chores}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-secondary">Today's Progress</p>
          {bonus_awarded ? (
            <p className="flex items-center gap-1 text-xs text-status-approved-text">
              <Gift size={12} />
              +{bonus_points} bonus!
            </p>
          ) : all_completed ? (
            <p className="text-xs text-status-approved-text">All done — nice.</p>
          ) : (
            <p className="text-xs text-text-muted">{total_chores - completed_chores} remaining</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="card p-4"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-status-pending-border" />
          <span className="font-semibold text-text-primary">Today's Progress</span>
        </div>
        {multiplier > 1 && (
          <span className="text-sm bg-status-pending-bg text-status-pending-text border border-status-pending-border px-2 py-0.5 rounded-full">
            {multiplier}x
          </span>
        )}
      </div>

      {/* Progress Ring */}
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="var(--ring-track)"
              strokeWidth="3"
            />
            <motion.circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke={all_completed ? 'var(--status-approved-border)' : 'var(--primary-500)'}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={97.4}
              initial={{ strokeDashoffset: 97.4 }}
              animate={{ strokeDashoffset: 97.4 - (97.4 * completion_percentage) / 100 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {all_completed ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.5 }}
              >
                <CheckCircle2 size={24} className="text-status-approved-border" />
              </motion.div>
            ) : (
              <span className="stat-number text-sm font-bold text-text-primary">{Math.round(completion_percentage)}%</span>
            )}
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {Array.from({ length: total_chores }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1 }}
              >
                {i < completed_chores ? (
                  <CheckCircle2 size={20} className="text-status-approved-border" />
                ) : (
                  <Circle size={20} className="text-text-muted opacity-50" />
                )}
              </motion.div>
            ))}
          </div>
          <p className="text-sm mt-2 text-text-secondary">
            {completed_chores} of {total_chores} chores done
          </p>
        </div>
      </div>

      {/* Bonus Section */}
      {all_completed && (
        <motion.div
          className={`mt-3 p-2 rounded-lg border ${bonus_awarded ? 'bg-status-approved-bg border-status-approved-border' : 'bg-status-pending-bg border-status-pending-border'}`}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-2">
            <Gift size={16} className={bonus_awarded ? 'text-status-approved-text' : 'text-status-pending-text'} />
            {bonus_awarded ? (
              <span className="text-sm text-status-approved-text">
                You earned +{bonus_points} bonus points!
              </span>
            ) : bonus_eligible ? (
              <span className="text-sm text-status-pending-text">
                Bonus points awaiting at midnight!
              </span>
            ) : (
              <span className="text-sm text-status-pending-text">
                Great job completing all chores!
              </span>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default DailyProgress;
