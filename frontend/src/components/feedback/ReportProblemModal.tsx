/**
 * In-app problem report modal (v0.17.0) — kid-friendly copy, auto-attaches
 * app version + current page so verbal reports ("it does nothing!") arrive
 * with the context that took a DB dive to reconstruct for the v0.16.2 bug.
 * Errors (including the daily-cap 429) surface via the global MutationCache
 * toast — no per-mutation error handling needed.
 */
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Send } from 'lucide-react';
import { feedbackApi } from '../../api/client';
import { useToast } from '../../hooks/useToast';

const MAX_LENGTH = 1000;

export function ReportProblemModal({ onClose }: { onClose: () => void }) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const location = useLocation();
  const toast = useToast();

  useEffect(() => {
    textareaRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const mutation = useMutation({
    mutationFn: () =>
      feedbackApi.create({
        message: message.trim(),
        app_version: __APP_VERSION__,
        page_path: location.pathname,
      }),
    onSuccess: () => {
      toast.success('Thanks! Your report was sent.');
      onClose();
    },
  });

  const canSubmit = message.trim().length >= 3 && !mutation.isPending;

  return (
    <div
      data-testid="report-problem-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-problem-title"
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div className="card p-6 max-w-sm w-full shadow-xl fade-in">
        <h3 id="report-problem-title" className="text-lg font-bold mb-1 text-text-primary">
          Report a problem
        </h3>
        <p className="mb-3 text-sm text-text-secondary">
          What went wrong? Parents will see your report.
        </p>
        <textarea
          ref={textareaRef}
          data-testid="report-problem-input"
          value={message}
          maxLength={MAX_LENGTH}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="I tapped Claim on Clean Room and nothing happened..."
          rows={4}
          className="w-full border border-bg-accent bg-bg-surface text-text-primary rounded-xl px-4 py-2.5 focus:border-primary-500 focus:outline-none transition-colors resize-none"
        />
        <p className="text-xs text-text-muted mt-1 text-right">
          {message.length}/{MAX_LENGTH}
        </p>
        <div className="flex gap-2 justify-end mt-3">
          <button data-testid="report-problem-cancel" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            data-testid="report-problem-submit"
            onClick={() => mutation.mutate()}
            disabled={!canSubmit}
            className="btn btn-primary flex items-center gap-2"
          >
            {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {mutation.isPending ? 'Sending...' : 'Send report'}
          </button>
        </div>
      </div>
    </div>
  );
}
