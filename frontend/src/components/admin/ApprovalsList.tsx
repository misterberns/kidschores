import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Gift, Check, X } from 'lucide-react';
import { kidsApi, choresApi, rewardsApi, approvalsApi } from '../../api/client';
import type { PendingChoreClaim, PendingRewardClaim } from '../../api/client';
import { ChorbieAnimated } from '../mascot';
import { useToast } from '../../hooks/useToast';

export function ApprovalsList() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: pending } = useQuery({
    queryKey: ['approvals'],
    queryFn: () => approvalsApi.pending().then(res => res.data),
  });

  const { data: kids = [] } = useQuery({
    queryKey: ['kids'],
    queryFn: () => kidsApi.list().then(res => res.data),
  });

  const { data: chores = [] } = useQuery({
    queryKey: ['chores'],
    queryFn: () => choresApi.list().then(res => res.data),
  });

  const approveChoreMutation = useMutation({
    mutationFn: (choreId: string) => choresApi.approve(choreId, 'Parent'),
    onSuccess: (_data, choreId) => {
      const chore = chores.find(c => c.id === choreId);
      if (chore) {
        toast.choreApproved(chore.name, chore.default_points);
      }
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['kids'] });
      queryClient.invalidateQueries({ queryKey: ['chores'] });
    },
  });

  const disapproveChoreMutation = useMutation({
    mutationFn: (choreId: string) => choresApi.disapprove(choreId, 'Parent'),
    onSuccess: (_data, choreId) => {
      const chore = chores.find(c => c.id === choreId);
      if (chore) {
        toast.choreDenied(chore.name);
      }
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['chores'] });
    },
  });

  const approveRewardMutation = useMutation({
    mutationFn: (rewardId: string) => rewardsApi.approve(rewardId, 'Parent'),
    onSuccess: () => {
      toast.success('Reward approved!');
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['kids'] });
    },
  });

  const pendingChores = pending?.chores || [];
  const pendingRewards = pending?.rewards || [];
  const totalPending = pendingChores.length + pendingRewards.length;

  if (totalPending === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto mb-4">
          <ChorbieAnimated expression="celebrating" animation="dance" size={100} />
        </div>
        <p className="text-lg font-bold text-text-primary">All caught up!</p>
        <p className="text-text-secondary">Great job keeping up with approvals!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pendingChores.map((claim: PendingChoreClaim) => {
        const kid = kids.find(k => k.id === claim.kid_id);
        const chore = chores.find(c => c.id === claim.chore_id);
        return (
          <div key={claim.id} data-testid={`approval-chore-${claim.chore_id}`} className="card p-4 border-l-4 border-l-status-claimed-border">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-text-primary">{kid?.name || 'Unknown'}</p>
                <p className="text-sm text-text-secondary">
                  claimed <span className="font-medium">{chore?.name || 'Unknown chore'}</span>
                </p>
              </div>
              <div className="w-10 h-10 bg-bg-accent rounded-xl flex items-center justify-center">
                <ClipboardList size={20} className="text-text-muted" />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                data-testid={`approve-chore-btn-${claim.chore_id}`}
                onClick={() => approveChoreMutation.mutate(claim.chore_id)}
                className="flex-1 bg-status-approved-border text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <Check size={18} /> Approve
              </button>
              <button
                data-testid={`deny-chore-btn-${claim.chore_id}`}
                onClick={() => disapproveChoreMutation.mutate(claim.chore_id)}
                className="flex-1 bg-status-overdue-bg text-status-overdue-text py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-status-overdue-border hover:text-white transition-colors"
              >
                <X size={18} /> Deny
              </button>
            </div>
          </div>
        );
      })}

      {pendingRewards.map((claim: PendingRewardClaim) => {
        const kid = kids.find(k => k.id === claim.kid_id);
        return (
          <div key={claim.id} data-testid={`approval-reward-${claim.reward_id}`} className="card p-4 border-l-4 border-l-accent-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-text-primary">{kid?.name || 'Unknown'}</p>
                <p className="text-sm text-text-secondary">wants a reward</p>
              </div>
              <div className="w-10 h-10 bg-bg-accent rounded-xl flex items-center justify-center">
                <Gift size={20} className="text-text-muted" />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                data-testid={`approve-reward-btn-${claim.reward_id}`}
                onClick={() => approveRewardMutation.mutate(claim.reward_id)}
                className="flex-1 bg-status-approved-border text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <Check size={18} /> Approve
              </button>
              <button data-testid={`deny-reward-btn-${claim.reward_id}`} className="flex-1 bg-status-overdue-bg text-status-overdue-text py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-status-overdue-border hover:text-white transition-colors">
                <X size={18} /> Deny
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
