/**
 * Parent-side problem-report review (v0.17.0) — Admin "Reports" tab. Lists
 * reports newest-first (default: unreviewed only) with the auto-attached
 * context line (version · page · role) and a mark-reviewed action.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bug, Check, Inbox } from 'lucide-react';
import { feedbackApi } from '../../api/client';
import type { FeedbackItem } from '../../api/client';
import { Button } from '../ui';
import { useToast } from '../../hooks/useToast';

function relativeTime(iso: string): string {
  const then = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`).getTime();
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function ReportCard({ item, onReview, isPending }: {
  item: FeedbackItem;
  onReview: (id: string) => void;
  isPending: boolean;
}) {
  return (
    <div data-testid={`feedback-${item.id}`} className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-text-primary flex items-center gap-2 flex-wrap">
            {item.reporter_name}
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              item.role === 'kid'
                ? 'bg-primary-50 dark:bg-primary-900 text-primary-500'
                : 'bg-bg-accent text-text-muted'
            }`}>
              {item.role}
            </span>
            {item.status === 'reviewed' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-status-approved-bg text-status-approved-text">
                Reviewed
              </span>
            )}
          </p>
          <p className="text-sm text-text-secondary mt-1 whitespace-pre-wrap break-words">{item.message}</p>
          <p className="text-xs text-text-muted mt-2 font-mono">
            {item.app_version ? `v${item.app_version}` : 'v?'} &middot; {item.page_path || '?'} &middot; {relativeTime(item.created_at)}
            {item.reviewed_by && ` · reviewed by ${item.reviewed_by}`}
          </p>
        </div>
        {item.status === 'new' && (
          <Button
            size="sm"
            variant="secondary"
            data-testid={`mark-reviewed-btn-${item.id}`}
            disabled={isPending}
            onClick={() => onReview(item.id)}
          >
            <Check size={16} />
            Reviewed
          </Button>
        )}
      </div>
    </div>
  );
}

export function FeedbackSection() {
  const [showReviewed, setShowReviewed] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: reports = [] } = useQuery({
    queryKey: ['feedback'],
    queryFn: () => feedbackApi.list().then(res => res.data),
  });

  const reviewMutation = useMutation({
    mutationFn: (id: string) => feedbackApi.markReviewed(id),
    onSuccess: () => {
      toast.success('Marked reviewed');
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
    },
  });

  const visible = showReviewed ? reports : reports.filter(r => r.status === 'new');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg text-text-primary flex items-center gap-2">
          <Bug size={20} className="text-primary-500" />
          Problem reports
        </h3>
        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={showReviewed}
            onChange={(e) => setShowReviewed(e.target.checked)}
            data-testid="show-reviewed-toggle"
          />
          Show reviewed
        </label>
      </div>

      {visible.length === 0 ? (
        <div className="card p-6 text-center text-text-muted">
          <Inbox size={32} className="mx-auto mb-2 opacity-50" />
          {showReviewed ? 'No reports yet.' : 'No new reports — all reviewed!'}
        </div>
      ) : (
        visible.map(item => (
          <ReportCard
            key={item.id}
            item={item}
            onReview={(id) => reviewMutation.mutate(id)}
            isPending={reviewMutation.isPending}
          />
        ))
      )}
    </div>
  );
}
