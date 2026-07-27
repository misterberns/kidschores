/**
 * Self-contained "Report a problem" trigger (v0.17.0) — owns its modal state.
 * Rendered in the Home page footer (the guaranteed kid-reachable surface) and
 * compact inside the parent bell-panel footer.
 */
import { useState } from 'react';
import { Bug } from 'lucide-react';
import { ReportProblemModal } from './ReportProblemModal';

export function ReportProblemButton({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        data-testid={compact ? 'report-problem-button-compact' : 'report-problem-button'}
        onClick={() => setOpen(true)}
        aria-label="Report a problem"
        title="Report a problem"
        className={
          compact
            ? 'flex items-center gap-1 text-xs text-text-muted hover:text-primary-500 transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-500/40 rounded'
            : 'touch-target inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-primary-500 transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-500/40 rounded-lg px-2'
        }
      >
        <Bug size={compact ? 12 : 16} />
        Report a problem
      </button>
      {open && <ReportProblemModal onClose={() => setOpen(false)} />}
    </>
  );
}
