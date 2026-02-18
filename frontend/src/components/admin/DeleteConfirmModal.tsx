import { Loader2, Trash2 } from 'lucide-react';

export function DeleteConfirmModal({
  itemName,
  onConfirm,
  onCancel,
  isPending,
}: {
  itemName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div data-testid="delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card p-6 max-w-sm w-full shadow-xl fade-in">
        <h3 id="delete-modal-title" className="text-lg font-bold mb-2 text-text-primary">Delete "{itemName}"?</h3>
        <p className="mb-4 text-text-secondary">This action cannot be undone.</p>
        <div className="flex gap-2 justify-end">
          <button
            data-testid="cancel-delete-btn"
            onClick={onCancel}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            data-testid="confirm-delete-btn"
            onClick={onConfirm}
            disabled={isPending}
            className="btn btn-danger flex items-center gap-2"
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            {isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
