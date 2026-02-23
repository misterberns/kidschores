import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil } from 'lucide-react';
import { rewardsApi } from '../../api/client';
import type { Reward } from '../../api/client';
import { DynamicIcon } from '../DynamicIcon';
import { FormInput } from './FormElements';
import { EntityCard } from './EntityCard';
import { DeleteConfirmModal } from './DeleteConfirmModal';

function AddRewardForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [cost, setCost] = useState(100);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: Partial<Reward>) => rewardsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      onClose();
    },
  });

  return (
    <div className="card p-4">
      <h3 className="font-bold text-lg mb-4 text-text-primary flex items-center gap-2">
        <Plus size={20} className="text-accent-500" /> Add Reward
      </h3>
      <FormInput
        label="Reward name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., Movie night"
      />
      <FormInput
        label="Cost (points)"
        type="number"
        value={cost}
        onChange={(e) => setCost(Number(e.target.value))}
      />
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => mutation.mutate({ name, cost })}
          disabled={!name || mutation.isPending}
          className="flex-1 bg-accent-500 text-white py-2.5 rounded-xl font-bold hover:bg-accent-600 transition-colors disabled:opacity-50"
        >
          {mutation.isPending ? 'Adding...' : 'Add'}
        </button>
        <button onClick={onClose} className="flex-1 btn btn-secondary">
          Cancel
        </button>
      </div>
    </div>
  );
}

function EditRewardForm({ reward, onClose }: { reward: Reward; onClose: () => void }) {
  const [name, setName] = useState(reward.name);
  const [cost, setCost] = useState(reward.cost);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: Partial<Reward>) => rewardsApi.update(reward.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      onClose();
    },
  });

  return (
    <div className="card p-4">
      <h3 className="font-bold text-lg mb-4 text-text-primary flex items-center gap-2">
        <Pencil size={20} className="text-accent-500" /> Edit Reward
      </h3>
      <FormInput
        label="Reward name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Reward name"
      />
      <FormInput
        label="Cost (points)"
        type="number"
        value={cost}
        onChange={(e) => setCost(Number(e.target.value))}
      />
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => mutation.mutate({ name, cost })}
          disabled={!name || mutation.isPending}
          className="flex-1 bg-accent-500 text-white py-2.5 rounded-xl font-bold hover:bg-accent-600 transition-colors disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving...' : 'Save'}
        </button>
        <button onClick={onClose} className="flex-1 btn btn-secondary">
          Cancel
        </button>
      </div>
    </div>
  );
}

export function RewardsSection() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const editFormRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: rewards = [] } = useQuery({
    queryKey: ['rewards'],
    queryFn: () => rewardsApi.list().then(res => res.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rewardsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      setDeleteConfirm(null);
    },
  });

  useEffect(() => {
    if (editingReward && editFormRef.current) {
      editFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [editingReward]);

  return (
    <div className="space-y-3">
      {showAddForm ? (
        <AddRewardForm onClose={() => setShowAddForm(false)} />
      ) : (
        <button
          data-testid="add-reward-btn"
          onClick={() => { setShowAddForm(true); setEditingReward(null); }}
          className="w-full border border-dashed border-accent-500 text-accent-500 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-accent-500/10 transition-colors"
        >
          <Plus size={20} /> Add Reward
        </button>
      )}
      {rewards.map((reward) => (
        editingReward?.id === reward.id ? (
          <div key={reward.id} ref={editFormRef}>
            <EditRewardForm reward={reward} onClose={() => setEditingReward(null)} />
          </div>
        ) : (
          <EntityCard
            key={reward.id}
            testId={`entity-reward-${reward.id}`}
            onEdit={() => { setEditingReward(reward); setShowAddForm(false); }}
            onDelete={() => setDeleteConfirm({ id: reward.id, name: reward.name })}
            icon={<div className="w-10 h-10 bg-accent-500/20 rounded-md border border-[var(--border-color)] flex items-center justify-center"><DynamicIcon icon={reward.icon || 'mdi:gift'} size={20} /></div>}
          >
            <p className="font-bold text-text-primary" data-testid={`reward-name-admin-${reward.id}`}>{reward.name}</p>
            <p className="text-sm text-text-muted" data-testid={`reward-cost-admin-${reward.id}`}>{reward.cost} points</p>
          </EntityCard>
        )
      ))}

      {deleteConfirm && (
        <DeleteConfirmModal
          itemName={deleteConfirm.name}
          onConfirm={() => deleteMutation.mutate(deleteConfirm.id)}
          onCancel={() => setDeleteConfirm(null)}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
