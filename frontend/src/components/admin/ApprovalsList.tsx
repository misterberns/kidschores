import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Gift, Check, X, ClipboardCheck } from 'lucide-react';
import { kidsApi, choresApi, rewardsApi, approvalsApi } from '../../api/client';
import type { PendingChoreClaim, PendingRewardClaim } from '../../api/client';
import { Button } from '../ui';
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

  // Chore mutations take the whole claim: kid_id disambiguates which kid's claim
  // to act on when a shared chore has claims from multiple kids (pre-v0.16.2 the
  // backend picked whichever row came first — the wrong kid could be credited).
  const approveChoreMutation = useMutation({
    mutationFn: (claim: PendingChoreClaim) => choresApi.approve(claim.chore_id, '', undefined, claim.kid_id),
    onSuccess: (_data, claim) => {
      const chore = chores.find(c => c.id === claim.chore_id);
      if (chore) {
        toast.choreApproved(chore.name, chore.default_points);
      }
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approvals-count'] });
      queryClient.invalidateQueries({ queryKey: ['kids'] });
      queryClient.invalidateQueries({ queryKey: ['chores'] });
    },
  });

  const disapproveChoreMutation = useMutation({
    mutationFn: (claim: PendingChoreClaim) => choresApi.disapprove(claim.chore_id, '', claim.kid_id),
    onSuccess: (_data, claim) => {
      const chore = chores.find(c => c.id === claim.chore_id);
      if (chore) {
        toast.choreDenied(chore.name);
      }
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approvals-count'] });
      queryClient.invalidateQueries({ queryKey: ['chores'] });
    },
  });

  const approveRewardMutation = useMutation({
    mutationFn: (rewardId: string) => rewardsApi.approve(rewardId, ''),
    onSuccess: () => {
      toast.success('Reward approved!');
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approvals-count'] });
      queryClient.invalidateQueries({ queryKey: ['kids'] });
    },
  });

  const disapproveRewardMutation = useMutation({
    mutationFn: (rewardId: string) => rewardsApi.disapprove(rewardId, ''),
    onSuccess: () => {
      toast.success('Reward denied');
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approvals-count'] });
    },
  });

  const pendingChores = pending?.chores || [];
  const pendingRewards = pending?.rewards || [];
  const totalPending = pendingChores.length + pendingRewards.length;

  if (totalPending === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary-50 flex items-center justify-center">
          <ClipboardCheck size={28} className="text-primary-500" />
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
              <Button
                variant="success"
                className="flex-1"
                data-testid={`approve-chore-btn-${claim.chore_id}`}
                onClick={() => approveChoreMutation.mutate(claim)}
              >
                <Check size={18} /> Approve
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                data-testid={`deny-chore-btn-${claim.chore_id}`}
                onClick={() => disapproveChoreMutation.mutate(claim)}
              >
                <X size={18} /> Deny
              </Button>
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
              <Button
                variant="success"
                className="flex-1"
                data-testid={`approve-reward-btn-${claim.reward_id}`}
                onClick={() => approveRewardMutation.mutate(claim.reward_id)}
              >
                <Check size={18} /> Approve
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                data-testid={`deny-reward-btn-${claim.reward_id}`}
                onClick={() => disapproveRewardMutation.mutate(claim.reward_id)}
              >
                <X size={18} /> Deny
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
