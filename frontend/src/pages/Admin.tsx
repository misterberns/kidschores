import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2, Users, ClipboardList, Gift, User, UserPlus,
  Plus, Pencil, Trash2, Check, X, Loader2, Bell, Lock, Unlock, Settings, HelpCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { kidsApi, choresApi, rewardsApi, approvalsApi, parentsApi } from '../api/client';
import type { Kid, Chore, Reward, Parent } from '../api/client';
import { DynamicIcon } from '../components/DynamicIcon';
import { ChorbieAnimated } from '../components/mascot';
import { useToast } from '../hooks/useToast';

type Tab = 'approvals' | 'kids' | 'chores' | 'rewards' | 'parents';

// Delete Confirmation Modal
function DeleteConfirmModal({
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
    <div data-testid="delete-modal" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card p-6 max-w-sm w-full shadow-xl fade-in">
        <h3 className="text-lg font-bold mb-2 text-text-primary">Delete "{itemName}"?</h3>
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

function ApprovalsList() {
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
      {pendingChores.map((claim: any) => {
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

      {pendingRewards.map((claim: any) => {
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

// Form input component for consistency
function FormInput({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="mb-3">
      <label className="block text-sm font-medium mb-1 text-text-secondary">{label}</label>
      <input
        {...props}
        className="w-full border-2 border-bg-accent bg-bg-surface text-text-primary rounded-xl px-4 py-2.5 focus:border-primary-500 focus:outline-none transition-colors"
      />
    </div>
  );
}

function FormSelect({ label, children, ...props }: { label: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="mb-3">
      <label className="block text-sm font-medium mb-1 text-text-secondary">{label}</label>
      <select
        {...props}
        className="w-full border-2 border-bg-accent bg-bg-surface text-text-primary rounded-xl px-4 py-2.5 focus:border-primary-500 focus:outline-none transition-colors"
      >
        {children}
      </select>
    </div>
  );
}

function AddKidForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: { name: string }) => kidsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kids'] });
      onClose();
    },
  });

  return (
    <div className="card p-4">
      <h3 className="font-bold text-lg mb-4 text-text-primary flex items-center gap-2">
        <UserPlus size={20} className="text-primary-500" /> Add Kid
      </h3>
      <FormInput
        label="Name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Kid's name"
      />
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => mutation.mutate({ name })}
          disabled={!name || mutation.isPending}
          className="flex-1 btn btn-primary"
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

function EditKidForm({ kid, onClose }: { kid: Kid; onClose: () => void }) {
  const [name, setName] = useState(kid.name);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: Partial<Kid>) => kidsApi.update(kid.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kids'] });
      onClose();
    },
  });

  return (
    <div className="card p-4">
      <h3 className="font-bold text-lg mb-4 text-text-primary flex items-center gap-2">
        <Pencil size={20} className="text-primary-500" /> Edit Kid
      </h3>
      <FormInput
        label="Name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Kid's name"
      />
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => mutation.mutate({ name })}
          disabled={!name || mutation.isPending}
          className="flex-1 btn btn-primary"
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

function AddChoreForm({ kids, onClose }: { kids: Kid[]; onClose: () => void }) {
  const [name, setName] = useState('');
  const [points, setPoints] = useState(10);
  const [selectedKids, setSelectedKids] = useState<string[]>([]);
  const [recurringFrequency, setRecurringFrequency] = useState('none');
  const [dueDate, setDueDate] = useState('');
  const [applicableDays, setApplicableDays] = useState<number[]>([]);
  const queryClient = useQueryClient();

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const mutation = useMutation({
    mutationFn: (data: Partial<Chore>) => choresApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores'] });
      onClose();
    },
  });

  return (
    <div className="card p-4">
      <h3 className="font-bold text-lg mb-4 text-text-primary flex items-center gap-2">
        <Plus size={20} className="text-primary-500" /> Add Chore
      </h3>
      <FormInput
        label="Chore name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., Clean room"
      />
      <FormInput
        label="Points"
        type="number"
        value={points}
        onChange={(e) => setPoints(Number(e.target.value))}
      />
      <div className="mb-3">
        <label className="block text-sm font-medium mb-2 text-text-secondary">Assign to:</label>
        <div className="flex gap-2 flex-wrap">
          {kids.map((kid) => (
            <button
              key={kid.id}
              type="button"
              onClick={() => {
                setSelectedKids(prev =>
                  prev.includes(kid.id)
                    ? prev.filter(id => id !== kid.id)
                    : [...prev, kid.id]
                );
              }}
              className="px-3 py-1.5 rounded-full border-2 font-medium transition-colors"
              style={{
                backgroundColor: selectedKids.includes(kid.id) ? 'var(--primary-500)' : 'var(--bg-accent)',
                borderColor: selectedKids.includes(kid.id) ? 'var(--primary-500)' : 'var(--bg-accent)',
                color: selectedKids.includes(kid.id) ? 'var(--text-inverse)' : 'var(--text-secondary)'
              }}
            >
              {kid.name}
            </button>
          ))}
        </div>
      </div>
      <FormSelect
        label="Recurring"
        value={recurringFrequency}
        onChange={(e) => setRecurringFrequency(e.target.value)}
      >
        <option value="none">None</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="biweekly">Biweekly</option>
        <option value="monthly">Monthly</option>
      </FormSelect>
      <FormInput
        label="Due Date (optional)"
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
      />
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 text-text-secondary">Applicable Days:</label>
        <div className="flex gap-1 flex-wrap">
          {dayNames.map((day, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setApplicableDays(prev =>
                  prev.includes(idx)
                    ? prev.filter(d => d !== idx)
                    : [...prev, idx]
                );
              }}
              className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                applicableDays.includes(idx)
                  ? 'bg-primary-500'
                  : 'bg-bg-accent text-text-secondary hover:bg-primary-100'
              }`}
              style={applicableDays.includes(idx) ? { color: 'var(--text-inverse)' } : undefined}
            >
              {day}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => mutation.mutate({
            name,
            default_points: points,
            assigned_kids: selectedKids,
            recurring_frequency: recurringFrequency,
            due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
            applicable_days: applicableDays.length > 0 ? applicableDays : undefined,
          })}
          disabled={!name || selectedKids.length === 0 || mutation.isPending}
          className="flex-1 btn btn-primary"
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

function EditChoreForm({ chore, kids, onClose }: { chore: Chore; kids: Kid[]; onClose: () => void }) {
  const [name, setName] = useState(chore.name);
  const [points, setPoints] = useState(chore.default_points);
  const [selectedKids, setSelectedKids] = useState<string[]>(chore.assigned_kids || []);
  const [recurringFrequency, setRecurringFrequency] = useState(chore.recurring_frequency || 'none');
  const [dueDate, setDueDate] = useState(chore.due_date?.split('T')[0] || '');
  const [applicableDays, setApplicableDays] = useState<number[]>(chore.applicable_days || []);
  const queryClient = useQueryClient();

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const mutation = useMutation({
    mutationFn: (data: Partial<Chore>) => choresApi.update(chore.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores'] });
      onClose();
    },
  });

  return (
    <div className="card p-4">
      <h3 className="font-bold text-lg mb-4 text-text-primary flex items-center gap-2">
        <Pencil size={20} className="text-primary-500" /> Edit Chore
      </h3>
      <FormInput
        label="Chore name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Chore name"
      />
      <FormInput
        label="Points"
        type="number"
        value={points}
        onChange={(e) => setPoints(Number(e.target.value))}
      />
      <div className="mb-3">
        <label className="block text-sm font-medium mb-2 text-text-secondary">Assign to:</label>
        <div className="flex gap-2 flex-wrap">
          {kids.map((kid) => (
            <button
              key={kid.id}
              type="button"
              onClick={() => {
                setSelectedKids(prev =>
                  prev.includes(kid.id)
                    ? prev.filter(id => id !== kid.id)
                    : [...prev, kid.id]
                );
              }}
              className="px-3 py-1.5 rounded-full border-2 font-medium transition-colors"
              style={{
                backgroundColor: selectedKids.includes(kid.id) ? 'var(--primary-500)' : 'var(--bg-accent)',
                borderColor: selectedKids.includes(kid.id) ? 'var(--primary-500)' : 'var(--bg-accent)',
                color: selectedKids.includes(kid.id) ? 'var(--text-inverse)' : 'var(--text-secondary)'
              }}
            >
              {kid.name}
            </button>
          ))}
        </div>
      </div>
      <FormSelect
        label="Recurring"
        value={recurringFrequency}
        onChange={(e) => setRecurringFrequency(e.target.value)}
      >
        <option value="none">None</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="biweekly">Biweekly</option>
        <option value="monthly">Monthly</option>
      </FormSelect>
      <FormInput
        label="Due Date"
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
      />
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 text-text-secondary">Applicable Days:</label>
        <div className="flex gap-1 flex-wrap">
          {dayNames.map((day, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setApplicableDays(prev =>
                  prev.includes(idx)
                    ? prev.filter(d => d !== idx)
                    : [...prev, idx]
                );
              }}
              className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                applicableDays.includes(idx)
                  ? 'bg-primary-500'
                  : 'bg-bg-accent text-text-secondary hover:bg-primary-100'
              }`}
              style={applicableDays.includes(idx) ? { color: 'var(--text-inverse)' } : undefined}
            >
              {day}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => mutation.mutate({
            name,
            default_points: points,
            assigned_kids: selectedKids,
            recurring_frequency: recurringFrequency,
            due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
            applicable_days: applicableDays.length > 0 ? applicableDays : undefined,
          })}
          disabled={!name || selectedKids.length === 0 || mutation.isPending}
          className="flex-1 btn btn-primary"
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

function AddParentForm({ kids, onClose }: { kids: Kid[]; onClose: () => void }) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [sendInvite, setSendInvite] = useState(false);
  const [selectedKids, setSelectedKids] = useState<string[]>([]);
  const [enableNotifications, setEnableNotifications] = useState(true);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: Partial<Parent> & { email?: string; send_invite?: boolean }) =>
      parentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      onClose();
    },
  });

  return (
    <div className="card p-4">
      <h3 className="font-bold text-lg mb-4 text-text-primary flex items-center gap-2">
        <UserPlus size={20} className="text-status-approved-border" /> Add Parent
      </h3>
      <FormInput
        label="Parent name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Parent name"
      />
      <FormInput
        label="PIN (optional, 4 digits)"
        type="text"
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
        placeholder="1234"
        maxLength={4}
      />
      <FormInput
        label="Email (optional)"
        type="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (!e.target.value) setSendInvite(false);
        }}
        placeholder="parent@email.com"
      />
      {email && (
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sendInvite}
              onChange={(e) => setSendInvite(e.target.checked)}
              className="w-5 h-5 rounded border-bg-accent text-primary-500 focus:ring-primary-500"
            />
            <span className="text-text-primary">Send email invitation</span>
          </label>
          <p className="text-xs text-text-muted mt-1 ml-7">
            They'll receive an email with a link to create their account
          </p>
        </div>
      )}
      <div className="mb-3">
        <label className="block text-sm font-medium mb-2 text-text-secondary">Associated Kids:</label>
        <div className="flex gap-2 flex-wrap">
          {kids.map((kid) => (
            <button
              key={kid.id}
              type="button"
              onClick={() => {
                setSelectedKids(prev =>
                  prev.includes(kid.id)
                    ? prev.filter(id => id !== kid.id)
                    : [...prev, kid.id]
                );
              }}
              className={`px-3 py-1.5 rounded-full border-2 font-medium transition-colors ${
                selectedKids.includes(kid.id)
                  ? 'bg-status-approved-border text-white border-status-approved-border'
                  : 'border-bg-accent text-text-secondary hover:border-status-approved-border'
              }`}
            >
              {kid.name}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enableNotifications}
            onChange={(e) => setEnableNotifications(e.target.checked)}
            className="w-5 h-5 rounded border-bg-accent text-primary-500 focus:ring-primary-500"
          />
          <span className="text-text-primary">Enable notifications</span>
        </label>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => mutation.mutate({
            name,
            pin: pin || undefined,
            associated_kids: selectedKids,
            enable_notifications: enableNotifications,
            email: email || undefined,
            send_invite: sendInvite,
          })}
          disabled={!name || mutation.isPending}
          className="flex-1 bg-status-approved-border text-white py-2.5 rounded-xl font-bold hover:opacity-90 transition-colors disabled:opacity-50"
        >
          {mutation.isPending ? 'Adding...' : sendInvite ? 'Add & Send Invite' : 'Add'}
        </button>
        <button onClick={onClose} className="flex-1 btn btn-secondary">
          Cancel
        </button>
      </div>
    </div>
  );
}

function EditParentForm({ parent, kids, onClose }: { parent: Parent; kids: Kid[]; onClose: () => void }) {
  const [name, setName] = useState(parent.name);
  const [pin, setPin] = useState(parent.pin || '');
  const [selectedKids, setSelectedKids] = useState<string[]>(parent.associated_kids || []);
  const [enableNotifications, setEnableNotifications] = useState(parent.enable_notifications);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: Partial<Parent>) => parentsApi.update(parent.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      onClose();
    },
  });

  return (
    <div className="card p-4">
      <h3 className="font-bold text-lg mb-4 text-text-primary flex items-center gap-2">
        <Pencil size={20} className="text-status-approved-border" /> Edit Parent
      </h3>
      <FormInput
        label="Parent name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Parent name"
      />
      <FormInput
        label="PIN (optional, 4 digits)"
        type="text"
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
        placeholder="1234"
        maxLength={4}
      />
      <div className="mb-3">
        <label className="block text-sm font-medium mb-2 text-text-secondary">Associated Kids:</label>
        <div className="flex gap-2 flex-wrap">
          {kids.map((kid) => (
            <button
              key={kid.id}
              type="button"
              onClick={() => {
                setSelectedKids(prev =>
                  prev.includes(kid.id)
                    ? prev.filter(id => id !== kid.id)
                    : [...prev, kid.id]
                );
              }}
              className={`px-3 py-1.5 rounded-full border-2 font-medium transition-colors ${
                selectedKids.includes(kid.id)
                  ? 'bg-status-approved-border text-white border-status-approved-border'
                  : 'border-bg-accent text-text-secondary hover:border-status-approved-border'
              }`}
            >
              {kid.name}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enableNotifications}
            onChange={(e) => setEnableNotifications(e.target.checked)}
            className="w-5 h-5 rounded border-bg-accent text-primary-500 focus:ring-primary-500"
          />
          <span className="text-text-primary">Enable notifications</span>
        </label>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => mutation.mutate({
            name,
            pin: pin || undefined,
            associated_kids: selectedKids,
            enable_notifications: enableNotifications,
          })}
          disabled={!name || mutation.isPending}
          className="flex-1 bg-status-approved-border text-white py-2.5 rounded-xl font-bold hover:opacity-90 transition-colors disabled:opacity-50"
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

// Entity card component for list items
function EntityCard({
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
            className="p-2 rounded-lg text-primary-500 hover:bg-bg-accent transition-colors"
            title="Edit"
          >
            <Pencil size={18} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg text-status-overdue-text hover:bg-status-overdue-bg transition-colors"
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

export function Admin() {
  const [activeTab, setActiveTab] = useState<Tab>('approvals');
  const [showAddForm, setShowAddForm] = useState<string | null>(null);
  const [editingKid, setEditingKid] = useState<Kid | null>(null);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; name: string } | null>(null);
  const queryClient = useQueryClient();

  // Delete mutations
  const deleteKidMutation = useMutation({
    mutationFn: (id: string) => kidsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kids'] });
      setDeleteConfirm(null);
    },
  });

  const deleteChoreMutation = useMutation({
    mutationFn: (id: string) => choresApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores'] });
      setDeleteConfirm(null);
    },
  });

  const deleteRewardMutation = useMutation({
    mutationFn: (id: string) => rewardsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      setDeleteConfirm(null);
    },
  });

  const deleteParentMutation = useMutation({
    mutationFn: (id: string) => parentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      setDeleteConfirm(null);
    },
  });

  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return;
    switch (deleteConfirm.type) {
      case 'kid':
        deleteKidMutation.mutate(deleteConfirm.id);
        break;
      case 'chore':
        deleteChoreMutation.mutate(deleteConfirm.id);
        break;
      case 'reward':
        deleteRewardMutation.mutate(deleteConfirm.id);
        break;
      case 'parent':
        deleteParentMutation.mutate(deleteConfirm.id);
        break;
    }
  };

  const isDeleting = deleteKidMutation.isPending || deleteChoreMutation.isPending ||
    deleteRewardMutation.isPending || deleteParentMutation.isPending;

  const { data: kids = [] } = useQuery({
    queryKey: ['kids'],
    queryFn: () => kidsApi.list().then(res => res.data),
  });

  const { data: chores = [] } = useQuery({
    queryKey: ['chores'],
    queryFn: () => choresApi.list().then(res => res.data),
  });

  const { data: rewards = [] } = useQuery({
    queryKey: ['rewards'],
    queryFn: () => rewardsApi.list().then(res => res.data),
  });

  const { data: parents = [] } = useQuery({
    queryKey: ['parents'],
    queryFn: () => parentsApi.list().then(res => res.data),
  });

  const { data: pendingCount } = useQuery({
    queryKey: ['approvals-count'],
    queryFn: () => approvalsApi.count().then(res => res.data),
    refetchInterval: 30000,
  });

  const tabs: { id: Tab; label: string; Icon: typeof CheckCircle2; badge?: number }[] = [
    { id: 'approvals', label: 'Approve', Icon: CheckCircle2, badge: pendingCount?.total },
    { id: 'kids', label: 'Kids', Icon: User },
    { id: 'chores', label: 'Chores', Icon: ClipboardList },
    { id: 'rewards', label: 'Rewards', Icon: Gift },
    { id: 'parents', label: 'Parents', Icon: Users },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2 text-text-primary">
          <Settings size={24} className="text-primary-500" />
          Parent Dashboard
        </h2>
        <Link
          to="/help"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
        >
          <HelpCircle size={18} />
          <span className="hidden sm:inline">Help</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const IconComponent = tab.Icon;
          return (
            <button
              key={tab.id}
              data-testid={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all
                ${activeTab === tab.id
                  ? 'shadow-md'
                  : 'bg-bg-surface text-text-secondary border border-bg-accent hover:border-primary-500'
                }`}
              style={activeTab === tab.id ? { backgroundColor: 'var(--primary-600)', color: 'white' } : undefined}
            >
              <IconComponent size={18} />
              <span>{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span data-testid="pending-badge" className="bg-accent-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'approvals' && <ApprovalsList />}

      {activeTab === 'kids' && (
        <div className="space-y-3">
          {editingKid ? (
            <EditKidForm kid={editingKid} onClose={() => setEditingKid(null)} />
          ) : showAddForm === 'kid' ? (
            <AddKidForm onClose={() => setShowAddForm(null)} />
          ) : (
            <button
              data-testid="add-kid-btn"
              onClick={() => setShowAddForm('kid')}
              className="w-full border-2 border-dashed border-primary-500 text-primary-500 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-50 transition-colors"
            >
              <Plus size={20} /> Add Kid
            </button>
          )}
          {kids.map((kid) => (
            <EntityCard
              key={kid.id}
              testId={`entity-kid-${kid.id}`}
              onEdit={() => setEditingKid(kid)}
              onDelete={() => setDeleteConfirm({ type: 'kid', id: kid.id, name: kid.name })}
              icon={<div className="w-10 h-10 bg-bg-accent rounded-full flex items-center justify-center"><User size={20} className="text-text-muted" /></div>}
            >
              <p className="font-bold text-text-primary" data-testid={`kid-name-${kid.id}`}>{kid.name}</p>
              <p className="text-sm text-text-muted" data-testid={`kid-points-${kid.id}`}>{Math.floor(kid.points)} points</p>
            </EntityCard>
          ))}
        </div>
      )}

      {activeTab === 'chores' && (
        <div className="space-y-3">
          {editingChore ? (
            <EditChoreForm chore={editingChore} kids={kids} onClose={() => setEditingChore(null)} />
          ) : showAddForm === 'chore' ? (
            <AddChoreForm kids={kids} onClose={() => setShowAddForm(null)} />
          ) : (
            <button
              data-testid="add-chore-btn"
              onClick={() => setShowAddForm('chore')}
              className="w-full border-2 border-dashed border-status-claimed-border text-status-claimed-text py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-status-claimed-bg transition-colors"
            >
              <Plus size={20} /> Add Chore
            </button>
          )}
          {chores.map((chore) => (
            <EntityCard
              key={chore.id}
              testId={`entity-chore-${chore.id}`}
              onEdit={() => setEditingChore(chore)}
              onDelete={() => setDeleteConfirm({ type: 'chore', id: chore.id, name: chore.name })}
              icon={<div className="w-10 h-10 bg-bg-accent rounded-md border-2 border-[var(--border-color)] flex items-center justify-center"><DynamicIcon icon={chore.icon || '🧹'} size={20} /></div>}
            >
              <p className="font-bold text-text-primary" data-testid={`chore-name-admin-${chore.id}`}>{chore.name}</p>
              <p className="text-sm text-text-muted" data-testid={`chore-points-admin-${chore.id}`}>
                {chore.default_points} points
                {chore.recurring_frequency && chore.recurring_frequency !== 'none' && (
                  <span className="ml-2 text-primary-500">• {chore.recurring_frequency}</span>
                )}
              </p>
              {chore.assigned_kids && chore.assigned_kids.length > 0 && (
                <p className="text-xs text-text-muted" data-testid={`chore-assigned-admin-${chore.id}`}>
                  Assigned: {chore.assigned_kids.map(kidId => kids.find(k => k.id === kidId)?.name || kidId).join(', ')}
                </p>
              )}
            </EntityCard>
          ))}
        </div>
      )}

      {activeTab === 'rewards' && (
        <div className="space-y-3">
          {editingReward ? (
            <EditRewardForm reward={editingReward} onClose={() => setEditingReward(null)} />
          ) : showAddForm === 'reward' ? (
            <AddRewardForm onClose={() => setShowAddForm(null)} />
          ) : (
            <button
              data-testid="add-reward-btn"
              onClick={() => setShowAddForm('reward')}
              className="w-full border-2 border-dashed border-accent-500 text-accent-500 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-accent-500/10 transition-colors"
            >
              <Plus size={20} /> Add Reward
            </button>
          )}
          {rewards.map((reward) => (
            <EntityCard
              key={reward.id}
              testId={`entity-reward-${reward.id}`}
              onEdit={() => setEditingReward(reward)}
              onDelete={() => setDeleteConfirm({ type: 'reward', id: reward.id, name: reward.name })}
              icon={<div className="w-10 h-10 bg-accent-500/20 rounded-md border-2 border-[var(--border-color)] flex items-center justify-center"><DynamicIcon icon={reward.icon || 'mdi:gift'} size={20} /></div>}
            >
              <p className="font-bold text-text-primary" data-testid={`reward-name-admin-${reward.id}`}>{reward.name}</p>
              <p className="text-sm text-text-muted" data-testid={`reward-cost-admin-${reward.id}`}>{reward.cost} points</p>
            </EntityCard>
          ))}
        </div>
      )}

      {activeTab === 'parents' && (
        <div className="space-y-3">
          {editingParent ? (
            <EditParentForm parent={editingParent} kids={kids} onClose={() => setEditingParent(null)} />
          ) : showAddForm === 'parent' ? (
            <AddParentForm kids={kids} onClose={() => setShowAddForm(null)} />
          ) : (
            <button
              data-testid="add-parent-btn"
              onClick={() => setShowAddForm('parent')}
              className="w-full border-2 border-dashed border-status-approved-border text-status-approved-text py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-status-approved-bg transition-colors"
            >
              <Plus size={20} /> Add Parent
            </button>
          )}
          {parents.map((parent) => (
            <EntityCard
              key={parent.id}
              testId={`entity-parent-${parent.id}`}
              onEdit={() => setEditingParent(parent)}
              onDelete={() => setDeleteConfirm({ type: 'parent', id: parent.id, name: parent.name })}
              icon={<div className="w-10 h-10 bg-status-approved-bg rounded-full flex items-center justify-center"><Users size={20} className="text-status-approved-text" /></div>}
            >
              <p className="font-bold text-text-primary" data-testid={`parent-name-${parent.id}`}>{parent.name}</p>
              <p className="text-sm text-text-muted" data-testid={`parent-kids-${parent.id}`}>
                {parent.associated_kids.length > 0
                  ? `Kids: ${parent.associated_kids.map(kidId => kids.find(k => k.id === kidId)?.name || kidId).join(', ')}`
                  : 'No kids assigned'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {parent.pin ? (
                  <span className="flex items-center gap-1 text-xs text-text-muted">
                    <Lock size={12} /> PIN set
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-text-muted">
                    <Unlock size={12} /> No PIN
                  </span>
                )}
                {parent.enable_notifications && (
                  <span className="flex items-center gap-1 text-xs text-text-muted">
                    <Bell size={12} /> Notifications on
                  </span>
                )}
              </div>
            </EntityCard>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <DeleteConfirmModal
          itemName={deleteConfirm.name}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirm(null)}
          isPending={isDeleting}
        />
      )}
    </div>
  );
}
