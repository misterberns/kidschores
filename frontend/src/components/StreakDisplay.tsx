import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Flame, Trophy, Snowflake, AlertTriangle, Target } from 'lucide-react';
import { kidsApi } from '../api/client';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface StreakDisplayProps {
  kidId: string;
  compact?: boolean;
}

const MILESTONE_EMOJIS: Record<number, string> = {
  3: '3 days - Getting started!',
  7: '1 week - Keep going!',
  14: '2 weeks - Amazing!',
  30: '1 month - Incredible!',
  50: '50 days - Superstar!',
  100: '100 days - Legend!',
  365: '1 year - Champion!',
};

export function StreakDisplay({ kidId, compact = false }: StreakDisplayProps) {
  const prefersReducedMotion = useReducedMotion();
  const queryClient = useQueryClient();

  const { data: streakInfo, isLoading } = useQuery({
    queryKey: ['streaks', kidId],
    queryFn: () => kidsApi.getStreaks(kidId).then(res => res.data),
    refetchInterval: 60000,
  });

  const useFreezeMutation = useMutation({
    mutationFn: () => kidsApi.useStreakFreeze(kidId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streaks', kidId] });
      queryClient.invalidateQueries({ queryKey: ['kids'] });
    },
  });

  if (isLoading || !streakInfo) {
    return (
      <div className="bg-bg-accent rounded-xl p-3 animate-pulse">
        <div className="h-6 bg-bg-surface rounded w-16 mb-2" />
        <div className="h-3 bg-bg-surface rounded w-24" />
      </div>
    );
  }

  const { overall_streak, longest_streak_ever, streak_freeze_count, is_streak_at_risk, next_milestone, days_to_next_milestone } = streakInfo;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <motion.div
          className="flex items-center gap-1"
          animate={
            overall_streak > 0 && !prefersReducedMotion
              ? { scale: [1, 1.1, 1] }
              : {}
          }
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
        >
          <Flame size={20} className={overall_streak > 0 ? 'streak-flame-icon' : 'text-text-muted opacity-50'} />
          <span className={`stat-number text-xl font-bold ${overall_streak > 0 ? 'streak-flame' : 'text-text-muted'}`}>{overall_streak}</span>
        </motion.div>
        {is_streak_at_risk && overall_streak > 0 && (
          <motion.span
            className="text-status-pending-border"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <AlertTriangle size={16} />
          </motion.span>
        )}
        {streak_freeze_count > 0 && (
          <span className="flex items-center gap-0.5 text-status-claimed-text text-xs">
            <Snowflake size={12} />
            {streak_freeze_count}
          </span>
        )}
      </div>
    );
  }

  return (
    <motion.div
      className="card p-4 text-text-primary"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header with Streak Count */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <motion.div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              overall_streak > 0 ? 'bg-status-pending-bg' : 'bg-bg-accent'
            }`}
            animate={
              overall_streak > 0 && !prefersReducedMotion
                ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }
                : {}
            }
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Flame size={28} className={overall_streak > 0 ? 'streak-flame-icon' : 'text-text-muted opacity-50'} />
          </motion.div>
          <div>
            <div className="flex items-center gap-2">
              <span className="stat-number text-3xl font-bold streak-flame">{overall_streak}</span>
              <span className="text-sm text-text-secondary">day streak</span>
            </div>
            {is_streak_at_risk && overall_streak > 0 && (
              <motion.p
                className="text-xs text-status-pending-text flex items-center gap-1"
                animate={{ opacity: [1, 0.6, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <AlertTriangle size={12} />
                Complete a chore to keep your streak!
              </motion.p>
            )}
          </div>
        </div>

        {/* Streak Freeze Badge */}
        {streak_freeze_count > 0 && (
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 bg-status-claimed-bg text-status-claimed-text border border-status-claimed-border px-2 py-1 rounded-lg text-sm">
              <Snowflake size={14} />
              <span>{streak_freeze_count} freeze{streak_freeze_count > 1 ? 's' : ''}</span>
            </div>
            {is_streak_at_risk && overall_streak > 0 && (
              <button
                onClick={() => useFreezeMutation.mutate()}
                disabled={useFreezeMutation.isPending}
                className="text-xs text-status-claimed-text underline"
              >
                Use freeze
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-bg-accent rounded-lg p-2 text-center">
          <div className="flex items-center justify-center gap-1">
            <Trophy size={14} className="text-status-pending-border" />
            <span className="font-bold">{longest_streak_ever}</span>
          </div>
          <p className="text-xs text-text-muted">Personal Best</p>
        </div>
        {next_milestone && (
          <div className="bg-bg-accent rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1">
              <Target size={14} className="text-status-approved-border" />
              <span className="font-bold">{days_to_next_milestone}</span>
            </div>
            <p className="text-xs text-text-muted">to {next_milestone} days</p>
          </div>
        )}
      </div>

      {/* Milestone Progress */}
      {next_milestone && (
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1 text-text-secondary">
            <span>Next milestone: {MILESTONE_EMOJIS[next_milestone] || `${next_milestone} days`}</span>
            <span>{overall_streak}/{next_milestone}</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ring-track)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, var(--streak-from), var(--streak-to))' }}
              initial={{ width: 0 }}
              animate={{ width: `${(overall_streak / next_milestone) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default StreakDisplay;
