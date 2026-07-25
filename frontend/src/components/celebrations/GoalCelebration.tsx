import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useToast } from '../../hooks/useToast';
import { getApiErrorMessage } from '../../utils/errorMessage';
import { goalsApi } from '../../api/client';
import type { SavingsGoal } from '../../api/client';
import { Confetti } from './Confetti';
import { DynamicIcon } from '../DynamicIcon';
import { formatGoalDollars } from '../goals/GoalRing';

interface GoalCelebrationProps {
  goal: SavingsGoal | null;
  kidId: string;
  kidName: string;
  pointsPerDollar: number;
  show: boolean;
  onClose: () => void;
}

/**
 * Full-screen celebration when a savings goal is reached (mirrors
 * BadgeCelebration). Primary CTA is the one-tap payout conversion; "Keep
 * saving" dismisses without converting (the goal stays active).
 */
export function GoalCelebration({ goal, kidId, kidName, pointsPerDollar, show, onClose }: GoalCelebrationProps) {
  const prefersReducedMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const toast = useToast();

  const convertMutation = useMutation({
    mutationFn: () => goalsApi.convert(kidId, goal!.id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['allowance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['allowance-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['allowance-pending'] });
      queryClient.invalidateQueries({ queryKey: ['kids'] });
      toast.success(`Payout of ${formatGoalDollars(res.data.payout.points_converted, pointsPerDollar)} requested!`);
      onClose();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Failed to request payout'));
    },
  });

  if (!goal) return null;
  const dollars = formatGoalDollars(goal.target_points, pointsPerDollar);

  return (
    <AnimatePresence>
      {show && (
        <>
          <Confetti show={show} />

          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div
              role="dialog"
              aria-label="Savings goal reached"
              data-testid="goal-celebration"
              className="bg-bg-elevated rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-bg-accent transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-500/40"
                aria-label="Close"
              >
                <X size={20} className="text-text-muted" />
              </button>

              <p className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-4">
                Goal reached
              </p>

              <motion.div
                className="flex items-center justify-center mb-6"
                animate={prefersReducedMotion ? {} : { scale: [1, 1.08, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.8 }}
              >
                <DynamicIcon icon={goal.icon} size={64} />
              </motion.div>

              <h2 className="text-2xl font-extrabold text-text-primary mb-2">{goal.name}</h2>
              <p className="text-text-secondary mb-1">
                You saved <span className="font-bold text-accent-500 stat-number">{goal.target_points.toLocaleString()} points</span> — that's {dollars}!
              </p>
              <p className="text-sm text-text-muted">
                Way to go, {kidName}!
              </p>

              <button
                onClick={() => convertMutation.mutate()}
                disabled={convertMutation.isPending}
                className="mt-6 btn btn-primary w-full"
                data-testid="goal-celebration-convert"
              >
                {convertMutation.isPending ? 'Requesting...' : `Request ${dollars} payout`}
              </button>
              <button
                onClick={onClose}
                className="mt-2 btn btn-outline w-full"
              >
                Keep saving
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
