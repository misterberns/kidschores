import { useQuery } from '@tanstack/react-query';
import { PiggyBank } from 'lucide-react';
import { goalsApi } from '../../api/client';
import type { GoalsListResponse, SavingsGoal } from '../../api/client';
import { ProgressRing } from '../gamification/ProgressRing';
import { DynamicIcon } from '../DynamicIcon';

/** Shared per-kid goals query — react-query dedupes by key, so the Home card
 * (ring + real points_per_dollar for the $ line + celebration watcher) and the
 * Allowance goals card all ride ONE fetch. */
export function useGoals(kidId: string | null | undefined) {
  return useQuery({
    queryKey: ['goals', kidId],
    queryFn: () => goalsApi.list(kidId!).then(res => res.data),
    enabled: !!kidId,
  });
}

/** Nearest-complete active goal (highest progress, tiebreak oldest) — the
 * closest payoff is the most motivating thing to show in the compact slot. */
export function pickTopGoal(data: GoalsListResponse | undefined): SavingsGoal | null {
  const active = (data?.goals ?? []).filter(g => g.status === 'active');
  if (active.length === 0) return null;
  return [...active].sort(
    (a, b) =>
      b.progress_pct - a.progress_pct ||
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )[0];
}

export function formatGoalDollars(points: number, pointsPerDollar: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    points / (pointsPerDollar || 100)
  );
}

/**
 * Compact savings-goal ring for the Home kid card: the nearest-complete active
 * goal as a ProgressRing in the kid's accent. Renders nothing when the kid has
 * no active goals.
 */
export function GoalRing({ kidId }: { kidId: string }) {
  const { data } = useGoals(kidId);
  const goal = pickTopGoal(data);
  if (!data || !goal) return null;

  const ppd = data.points_per_dollar;
  const balance = Math.min(Math.floor(data.current_points), goal.target_points);

  return (
    <div className="mt-4 pt-4 border-t border-border-primary" data-testid={`goal-ring-${kidId}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2 flex items-center gap-1.5">
        <PiggyBank size={13} />
        Savings Goal
      </p>
      <div className="flex items-center gap-3">
        <ProgressRing
          progress={goal.progress_pct}
          size={56}
          strokeWidth={5}
          color="var(--kid-accent, var(--primary-500))"
        >
          <DynamicIcon icon={goal.icon} size={24} />
        </ProgressRing>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{goal.name}</p>
          <p className="text-xs text-text-muted stat-number">
            {balance.toLocaleString()} / {goal.target_points.toLocaleString()} pts
            <span className="ml-1">({formatGoalDollars(goal.target_points, ppd)} goal)</span>
          </p>
          {goal.reached ? (
            <p className="text-xs font-semibold text-accent-500">Goal reached — ready to cash in!</p>
          ) : (
            <p className="text-xs text-text-muted">
              {(goal.target_points - balance).toLocaleString()} pts to go
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
