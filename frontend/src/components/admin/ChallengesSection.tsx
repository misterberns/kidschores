import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Target, Trophy, Trash2, Sparkles } from 'lucide-react';
import { challengesApi } from '../../api/client';
import type { Challenge, ChallengeTemplate } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { Button } from '../ui';
import { DynamicIcon } from '../DynamicIcon';

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  return (
    <div className="h-2 bg-bg-accent rounded-full overflow-hidden flex-1">
      <div
        className="h-full rounded-full bg-primary-500 transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function ChallengeCard({ challenge, onDelete }: { challenge: Challenge; onDelete: () => void }) {
  const dateFmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div data-testid={`challenge-${challenge.id}`} className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900 rounded-xl flex items-center justify-center flex-shrink-0">
            <DynamicIcon icon={challenge.icon} size={20} className="text-primary-500" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-text-primary flex items-center gap-2">
              {challenge.name}
              {challenge.active && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-status-approved-bg text-status-approved-text">
                  Active
                </span>
              )}
            </p>
            <p className="text-sm text-text-secondary truncate">
              {challenge.description} · {dateFmt(challenge.start_date)}–{dateFmt(challenge.end_date)}
              {challenge.bonus_points > 0 && ` · +${challenge.bonus_points} pts`}
              {challenge.badge_id && ' · 🏅 badge'}
            </p>
          </div>
        </div>
        <button
          onClick={onDelete}
          aria-label="Delete challenge"
          title="Delete challenge"
          className="p-2 rounded-lg text-status-overdue-text hover:bg-status-overdue-bg transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-500/40 flex-shrink-0"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {challenge.progress.length > 0 && (
        <div className="mt-3 space-y-2">
          {challenge.progress.map(entry => (
            <div key={entry.kid_id} className="flex items-center gap-3 text-sm">
              <span className="w-20 truncate text-text-secondary">{entry.kid_name}</span>
              <ProgressBar value={entry.progress} max={entry.target} />
              <span className="text-text-muted whitespace-nowrap">
                {entry.completed ? (
                  <span className="text-status-approved-text font-medium flex items-center gap-1">
                    <Trophy size={14} /> Done!
                  </span>
                ) : (
                  `${entry.progress}/${entry.target}`
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChallengesSection() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: challenges = [] } = useQuery({
    queryKey: ['challenges'],
    queryFn: () => challengesApi.list().then(res => res.data),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['challenge-templates'],
    queryFn: () => challengesApi.templates().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (template: ChallengeTemplate) => challengesApi.create(template),
    onSuccess: (_res, template) => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      toast.success(`Challenge "${template.name}" started!`);
    },
    meta: { errorFallback: 'Failed to create challenge' },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => challengesApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['challenges'] }),
  });

  return (
    <div className="space-y-4">
      {/* Templates */}
      <div className="card p-4">
        <h3 className="font-bold text-lg mb-1 text-text-primary flex items-center gap-2">
          <Sparkles size={20} className="text-accent-500" />
          Start a challenge
        </h3>
        <p className="text-sm text-text-secondary mb-3">
          Time-boxed goals for the kids — finishing awards bonus points (and sometimes a badge).
        </p>
        <div className="flex flex-wrap gap-2">
          {templates.map(template => (
            <Button
              key={template.name}
              variant="secondary"
              size="sm"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate(template)}
            >
              <DynamicIcon icon={template.icon} size={16} />
              {template.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Existing challenges */}
      {challenges.length === 0 ? (
        <div className="card p-6 text-center text-text-muted">
          <Target size={32} className="mx-auto mb-2 opacity-50" />
          No challenges yet — start one from a template above.
        </div>
      ) : (
        challenges.map(challenge => (
          <ChallengeCard
            key={challenge.id}
            challenge={challenge}
            onDelete={() => deleteMutation.mutate(challenge.id)}
          />
        ))
      )}
    </div>
  );
}
