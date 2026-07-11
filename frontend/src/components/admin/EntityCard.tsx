import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';

export function EntityCard({
  testId,
  children,
  onEdit,
  onDelete,
  icon,
}: {
  testId: string;
  children: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <div data-testid={testId} className="card p-4">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">{children}</div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            aria-label="Edit"
            className="p-2 rounded-lg text-primary-500 hover:bg-bg-accent transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-500/40"
            title="Edit"
          >
            <Pencil size={18} />
          </button>
          <button
            onClick={onDelete}
            aria-label="Delete"
            className="p-2 rounded-lg text-status-overdue-text hover:bg-status-overdue-bg transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-500/40"
            title="Delete"
          >
            <Trash2 size={18} />
          </button>
          {icon && <div className="ml-2">{icon}</div>}
        </div>
      </div>
    </div>
  );
}
