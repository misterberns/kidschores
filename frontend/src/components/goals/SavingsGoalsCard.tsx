import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { PiggyBank, Plus, Pencil, Trash2, Rocket, ChevronDown, ChevronRight, Send } from 'lucide-react';
import { goalsApi, kidsApi } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { getApiErrorMessage } from '../../utils/errorMessage';
import { Button, IconButton } from '../ui';
import { DynamicIcon } from '../DynamicIcon';
import { ProgressRing } from '../gamification/ProgressRing';
import { useGoals, formatGoalDollars } from './GoalRing';

const MAX_ACTIVE_GOALS = 3;
const GOAL_ICONS = ['piggy-bank', 'gamepad-2', 'bike', 'gift', 'star', 'trophy'];

interface GoalFormState {
  id: string | null; // null = creating
  name: string;
  icon: string;
  targetPoints: string;
  targetDate: string; // yyyy-mm-dd or ''
}

const EMPTY_FORM: GoalFormState = { id: null, name: '', icon: 'piggy-bank', targetPoints: '', targetDate: '' };

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface SavingsGoalsCardProps {
  kidId: string;
  isParent: boolean;
}

/**
 * Savings goals on the Allowance page (v0.16.0): active goals with live
 * progress rings, inline create/edit, one-tap payout when reached, and a
 * parent-only Boost that rides the existing points-adjust endpoint.
 */
export function SavingsGoalsCard({ kidId, isParent }: SavingsGoalsCardProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data } = useGoals(kidId);

  const [form, setForm] = useState<GoalFormState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [boostGoalId, setBoostGoalId] = useState<string | null>(null);
  const [boostPoints, setBoostPoints] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['goals'] });
    queryClient.invalidateQueries({ queryKey: ['allowance-summary'] });
    queryClient.invalidateQueries({ queryKey: ['allowance-payouts'] });
    queryClient.invalidateQueries({ queryKey: ['allowance-pending'] });
    queryClient.invalidateQueries({ queryKey: ['kids'] });
  };

  const saveMutation = useMutation({
    mutationFn: (f: GoalFormState) => {
      const body = {
        name: f.name.trim(),
        icon: f.icon,
        target_points: parseInt(f.targetPoints, 10),
        target_date: f.targetDate ? new Date(`${f.targetDate}T12:00:00`).toISOString() : null,
      };
      return f.id ? goalsApi.update(kidId, f.id, body) : goalsApi.create(kidId, body);
    },
    onSuccess: (_res, f) => {
      invalidate();
      setForm(null);
      toast.success(f.id ? 'Goal updated' : 'Goal created — start saving!');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to save goal')),
  });

  const deleteMutation = useMutation({
    mutationFn: (goalId: string) => goalsApi.delete(kidId, goalId),
    onSuccess: () => {
      invalidate();
      setConfirmDelete(null);
      toast.success('Goal removed');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to remove goal')),
  });

  const convertMutation = useMutation({
    mutationFn: (goalId: string) => goalsApi.convert(kidId, goalId),
    onSuccess: (res) => {
      invalidate();
      toast.success(`Payout of ${formatGoalDollars(res.data.payout.points_converted, ppd)} requested!`);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to request payout')),
  });

  const boostMutation = useMutation({
    mutationFn: ({ points, goalName }: { points: number; goalName: string }) =>
      kidsApi.adjustPoints(kidId, points, `Boost toward "${goalName}"`),
    onSuccess: (_res, vars) => {
      invalidate();
      setBoostGoalId(null);
      setBoostPoints('');
      toast.success(`Boosted ${vars.points} points toward "${vars.goalName}"`);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to boost')),
  });

  if (!data) return null;
  const ppd = data.points_per_dollar;
  const active = data.goals.filter(g => g.status === 'active');
  const completed = data.goals.filter(g => g.status === 'completed');
  const balance = Math.floor(data.current_points);

  const formValid = form && form.name.trim().length > 0 && parseInt(form.targetPoints, 10) > 0;
  const formDollarPreview = form ? (parseInt(form.targetPoints, 10) || 0) / ppd : 0;

  return (
    <div className="card p-4" data-testid="savings-goals-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg text-text-primary flex items-center gap-2">
          <PiggyBank size={20} className="text-accent-500" />
          Savings Goals
        </h3>
        {active.length < MAX_ACTIVE_GOALS && !form && (
          <Button size="sm" variant="outline" onClick={() => setForm(EMPTY_FORM)} data-testid="add-goal-button">
            <Plus size={16} />
            Add goal
          </Button>
        )}
      </div>

      {/* Inline create/edit form */}
      {form && (
        <motion.div
          className="rounded-xl bg-bg-accent p-4 mb-4"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          data-testid="goal-form"
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1" htmlFor="goal-name">
                What are you saving for?
              </label>
              <input
                id="goal-name"
                type="text"
                maxLength={100}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="New bike, video game..."
                className="w-full border border-bg-accent bg-bg-surface text-text-primary rounded-xl px-4 py-2.5 focus:border-primary-500 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <span className="block text-sm font-medium text-text-secondary mb-1">Icon</span>
              <div className="flex gap-2">
                {GOAL_ICONS.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setForm({ ...form, icon })}
                    aria-label={`Icon ${icon}`}
                    aria-pressed={form.icon === icon}
                    className={`p-2 rounded-lg border-2 transition-colors ${
                      form.icon === icon ? 'border-primary-500 bg-bg-surface' : 'border-transparent bg-bg-surface/50 hover:border-bg-elevated'
                    }`}
                  >
                    <DynamicIcon icon={icon} size={22} />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1" htmlFor="goal-target">
                  Target (points)
                </label>
                <input
                  id="goal-target"
                  type="number"
                  min={1}
                  value={form.targetPoints}
                  onChange={(e) => setForm({ ...form, targetPoints: e.target.value })}
                  placeholder="500"
                  className="w-full border border-bg-accent bg-bg-surface text-text-primary rounded-xl px-4 py-2.5 focus:border-primary-500 focus:outline-none transition-colors"
                />
                <p className="text-xs text-text-muted mt-1">= {formatGoalDollars(parseInt(form.targetPoints, 10) || 0, ppd)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1" htmlFor="goal-date">
                  Target date (optional)
                </label>
                <input
                  id="goal-date"
                  type="date"
                  value={form.targetDate}
                  onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                  className="w-full border border-bg-accent bg-bg-surface text-text-primary rounded-xl px-4 py-2.5 focus:border-primary-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!formValid || saveMutation.isPending}
                loading={saveMutation.isPending}
                onClick={() => form && saveMutation.mutate(form)}
                data-testid="save-goal-button"
              >
                {form.id ? 'Save changes' : 'Create goal'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setForm(null)}>
                Cancel
              </Button>
            </div>
            {formDollarPreview > 0 && formDollarPreview < 1 && (
              <p className="text-xs text-status-pending-text">
                Heads up: goals under the minimum payout can't be cashed in.
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* Active goals */}
      {active.length === 0 && !form ? (
        <p className="text-center text-text-secondary py-6 text-sm">
          No savings goals yet — pick something to save for!
        </p>
      ) : (
        <div className="space-y-3">
          {active.map(goal => (
            <motion.div
              key={goal.id}
              className="rounded-xl bg-bg-accent p-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              data-testid={`goal-row-${goal.id}`}
            >
              <div className="flex items-center gap-3">
                <ProgressRing progress={goal.progress_pct} size={48} strokeWidth={4} color="var(--accent-500)">
                  <DynamicIcon icon={goal.icon} size={20} />
                </ProgressRing>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary truncate">{goal.name}</p>
                  <p className="text-xs text-text-muted stat-number">
                    {Math.min(balance, goal.target_points).toLocaleString()} / {goal.target_points.toLocaleString()} pts
                    <span className="ml-1">({formatGoalDollars(goal.target_points, ppd)})</span>
                  </p>
                  {goal.target_date && (
                    <p className="text-xs text-text-muted">by {formatDate(goal.target_date)}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {isParent && (
                    <IconButton
                      label={`Boost points toward ${goal.name}`}
                      size="sm"
                      onClick={() => { setBoostGoalId(boostGoalId === goal.id ? null : goal.id); setBoostPoints(''); }}
                    >
                      <Rocket size={16} />
                    </IconButton>
                  )}
                  <IconButton
                    label={`Edit ${goal.name}`}
                    size="sm"
                    onClick={() => setForm({
                      id: goal.id,
                      name: goal.name,
                      icon: goal.icon,
                      targetPoints: String(goal.target_points),
                      targetDate: goal.target_date ? goal.target_date.slice(0, 10) : '',
                    })}
                  >
                    <Pencil size={16} />
                  </IconButton>
                  <IconButton
                    label={`Remove ${goal.name}`}
                    size="sm"
                    variant="danger"
                    onClick={() => setConfirmDelete(goal.id)}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </div>
              </div>

              {/* One-tap payout when reached */}
              {goal.reached && (
                <Button
                  size="sm"
                  fullWidth
                  className="mt-3"
                  loading={convertMutation.isPending}
                  onClick={() => convertMutation.mutate(goal.id)}
                  data-testid={`convert-goal-${goal.id}`}
                >
                  <Send size={16} />
                  Cash in — request {formatGoalDollars(goal.target_points, ppd)} payout
                </Button>
              )}

              {/* Parent boost input */}
              {isParent && boostGoalId === goal.id && (
                <div className="mt-3 pt-3 border-t border-bg-surface flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={boostPoints}
                    onChange={(e) => setBoostPoints(e.target.value)}
                    placeholder="Bonus points"
                    aria-label={`Bonus points toward ${goal.name}`}
                    className="flex-1 border border-bg-accent bg-bg-surface text-text-primary rounded-xl px-3 py-2 text-sm focus:border-primary-500 focus:outline-none transition-colors"
                  />
                  <Button
                    size="sm"
                    disabled={!(parseInt(boostPoints, 10) > 0) || boostMutation.isPending}
                    loading={boostMutation.isPending}
                    onClick={() => boostMutation.mutate({ points: parseInt(boostPoints, 10), goalName: goal.name })}
                  >
                    Boost
                  </Button>
                </div>
              )}

              {/* Delete confirm */}
              {confirmDelete === goal.id && (
                <div className="mt-3 pt-3 border-t border-bg-surface flex items-center justify-between gap-2">
                  <p className="text-sm text-text-secondary">Remove this goal? Points are kept.</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="danger" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate(goal.id)}>
                      Remove
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setConfirmDelete(null)}>
                      Keep
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {active.length >= MAX_ACTIVE_GOALS && (
        <p className="mt-3 text-xs text-text-muted text-center">
          Max {MAX_ACTIVE_GOALS} goals at a time — finish one to add another.
        </p>
      )}

      {/* Completed goals (collapsed history) */}
      {completed.length > 0 && (
        <div className="mt-4 pt-3 border-t border-bg-accent">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            aria-expanded={showCompleted}
          >
            {showCompleted ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            Completed ({completed.length})
          </button>
          {showCompleted && (
            <div className="mt-2 space-y-2">
              {completed.map(goal => (
                <div key={goal.id} className="flex items-center gap-3 rounded-lg bg-bg-accent/50 px-3 py-2">
                  <DynamicIcon icon={goal.icon} size={20} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">{goal.name}</p>
                    <p className="text-xs text-text-muted">
                      {formatGoalDollars(goal.target_points, ppd)}
                      {goal.completed_at && <span> · {formatDate(goal.completed_at)}</span>}
                    </p>
                  </div>
                  <IconButton
                    label={`Delete completed goal ${goal.name}`}
                    size="sm"
                    variant="danger"
                    onClick={() => deleteMutation.mutate(goal.id)}
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
