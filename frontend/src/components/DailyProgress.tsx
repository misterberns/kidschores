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
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 animate-pulse">
        <div className="h-4 bg-white/20 rounded w-24 mb-2" />
        <div className="h-2 bg-white/20 rounded w-full" />
      </div>
    );
  }

  const { total_chores, completed_chores, completion_percentage, all_completed, bonus_eligible, bonus_awarded, bonus_points, multiplier } = progress;

  if (total_chores === 0) {
    return null; // No recurring chores for today
  }

  if (compact) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Today's Progress</span>
          <span className="text-sm font-bold">{completed_chores}/{total_chores}</span>
        </div>
        <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${all_completed ? 'bg-green-400' : 'bg-white/60'}`}
            initial={{ width: 0 }}
            animate={{ width: `${completion_percentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        {bonus_awarded && (
          <div className="flex items-center gap-1 mt-2 text-xs text-green-300">
            <Gift size={12} />
            <span>+{bonus_points} bonus!</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.div
      className="bg-white/15 backdrop-blur-sm rounded-xl p-4"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-yellow-300" />
          <span className="font-semibold">Today's Progress</span>
        </div>
        {multiplier > 1 && (
          <span className="text-sm bg-yellow-400/20 text-yellow-300 px-2 py-0.5 rounded-full">
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
              stroke="currentColor"
              strokeWidth="3"
              className="text-white/20"
            />
            <motion.circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={97.4}
              initial={{ strokeDashoffset: 97.4 }}
              animate={{ strokeDashoffset: 97.4 - (97.4 * completion_percentage) / 100 }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={all_completed ? 'text-green-400' : 'text-white'}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {all_completed ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.5 }}
              >
                <CheckCircle2 size={24} className="text-green-400" />
              </motion.div>
            ) : (
              <span className="text-sm font-bold">{Math.round(completion_percentage)}%</span>
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
                  <CheckCircle2 size={20} className="text-green-400" />
                ) : (
                  <Circle size={20} className="text-white/30" />
                )}
              </motion.div>
            ))}
          </div>
          <p className="text-sm mt-2 opacity-80">
            {completed_chores} of {total_chores} chores done
          </p>
        </div>
      </div>

      {/* Bonus Section */}
      {all_completed && (
        <motion.div
          className={`mt-3 p-2 rounded-lg ${bonus_awarded ? 'bg-green-400/20' : 'bg-yellow-400/20'}`}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-2">
            <Gift size={16} className={bonus_awarded ? 'text-green-300' : 'text-yellow-300'} />
            {bonus_awarded ? (
              <span className="text-sm text-green-300">
                You earned +{bonus_points} bonus points!
              </span>
            ) : bonus_eligible ? (
              <span className="text-sm text-yellow-300">
                Bonus points awaiting at midnight!
              </span>
            ) : (
              <span className="text-sm text-yellow-300">
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
