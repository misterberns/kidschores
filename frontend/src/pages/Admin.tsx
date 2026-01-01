import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kidsApi, choresApi, rewardsApi, approvalsApi, parentsApi } from '../api/client';
import type { Kid, Chore, Reward, Parent } from '../api/client';

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
        <h3 className="text-lg font-bold mb-2">Delete "{itemName}"?</h3>
        <p className="text-gray-600 mb-4">This action cannot be undone.</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
          >
            {isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ApprovalsList() {
  const queryClient = useQueryClient();

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['kids'] });
      queryClient.invalidateQueries({ queryKey: ['chores'] });
    },
  });

  const approveRewardMutation = useMutation({
    mutationFn: (rewardId: string) => rewardsApi.approve(rewardId, 'Parent'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['kids'] });
    },
  });

  const pendingChores = pending?.chores || [];
  const pendingRewards = pending?.rewards || [];
  const totalPending = pendingChores.length + pendingRewards.length;

  if (totalPending === 0) {
    return (
      <div className="text-center py-8">
        <span className="text-5xl">✅</span>
        <p className="text-gray-600 mt-2">All caught up!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pendingChores.map((claim: any) => {
        const kid = kids.find(k => k.id === claim.kid_id);
        const chore = chores.find(c => c.id === claim.chore_id);
        return (
          <div key={claim.id} className="bg-white rounded-xl p-4 shadow border-l-4 border-blue-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-gray-800">{kid?.name || 'Unknown'}</p>
                <p className="text-sm text-gray-600">
                  claimed <span className="font-medium">{chore?.name || 'Unknown chore'}</span>
                </p>
              </div>
              <span className="text-xl">🧹</span>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => approveChoreMutation.mutate(claim.chore_id)}
                className="flex-1 bg-green-500 text-white py-2 rounded-lg font-bold"
              >
                ✓ Approve
              </button>
              <button className="flex-1 bg-red-100 text-red-600 py-2 rounded-lg font-bold">
                ✗ Deny
              </button>
            </div>
          </div>
        );
      })}

      {pendingRewards.map((claim: any) => {
        const kid = kids.find(k => k.id === claim.kid_id);
        return (
          <div key={claim.id} className="bg-white rounded-xl p-4 shadow border-l-4 border-purple-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-gray-800">{kid?.name || 'Unknown'}</p>
                <p className="text-sm text-gray-600">wants a reward</p>
              </div>
              <span className="text-xl">🎁</span>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => approveRewardMutation.mutate(claim.reward_id)}
                className="flex-1 bg-green-500 text-white py-2 rounded-lg font-bold"
              >
                ✓ Approve
              </button>
              <button className="flex-1 bg-red-100 text-red-600 py-2 rounded-lg font-bold">
                ✗ Deny
              </button>
            </div>
          </div>
        );
      })}
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
    <div className="bg-white rounded-xl p-4 shadow">
      <h3 className="font-bold text-lg mb-4">Add Kid</h3>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Kid's name"
        className="w-full border-2 rounded-lg px-4 py-2 mb-4"
      />
      <div className="flex gap-2">
        <button
          onClick={() => mutation.mutate({ name })}
          disabled={!name}
          className="flex-1 bg-primary-500 text-white py-2 rounded-lg font-bold disabled:opacity-50"
        >
          Add
        </button>
        <button onClick={onClose} className="flex-1 bg-gray-200 py-2 rounded-lg">
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
    <div className="bg-white rounded-xl p-4 shadow">
      <h3 className="font-bold text-lg mb-4">Edit Kid</h3>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Kid's name"
        className="w-full border-2 rounded-lg px-4 py-2 mb-4"
      />
      <div className="flex gap-2">
        <button
          onClick={() => mutation.mutate({ name })}
          disabled={!name || mutation.isPending}
          className="flex-1 bg-primary-500 text-white py-2 rounded-lg font-bold disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving...' : 'Save'}
        </button>
        <button onClick={onClose} className="flex-1 bg-gray-200 py-2 rounded-lg">
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
    <div className="bg-white rounded-xl p-4 shadow">
      <h3 className="font-bold text-lg mb-4">Add Chore</h3>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Chore name"
        className="w-full border-2 rounded-lg px-4 py-2 mb-3"
      />
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Points</label>
        <input
          type="number"
          value={points}
          onChange={(e) => setPoints(Number(e.target.value))}
          className="w-full border-2 rounded-lg px-4 py-2"
        />
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium mb-2">Assign to:</label>
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
              className={`px-3 py-1 rounded-full border-2 ${
                selectedKids.includes(kid.id)
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'border-gray-300'
              }`}
            >
              {kid.name}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Recurring</label>
        <select
          value={recurringFrequency}
          onChange={(e) => setRecurringFrequency(e.target.value)}
          className="w-full border-2 rounded-lg px-4 py-2"
        >
          <option value="none">None</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="biweekly">Biweekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Due Date (optional)</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full border-2 rounded-lg px-4 py-2"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Applicable Days (optional):</label>
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
              className={`px-2 py-1 rounded text-sm ${
                applicableDays.includes(idx)
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
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
          className="flex-1 bg-primary-500 text-white py-2 rounded-lg font-bold disabled:opacity-50"
        >
          {mutation.isPending ? 'Adding...' : 'Add'}
        </button>
        <button onClick={onClose} className="flex-1 bg-gray-200 py-2 rounded-lg">
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
  const [applicableDays, setApplicableDays] = useState<number[]>([]);
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
    <div className="bg-white rounded-xl p-4 shadow">
      <h3 className="font-bold text-lg mb-4">Edit Chore</h3>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Chore name"
        className="w-full border-2 rounded-lg px-4 py-2 mb-3"
      />
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Points</label>
        <input
          type="number"
          value={points}
          onChange={(e) => setPoints(Number(e.target.value))}
          className="w-full border-2 rounded-lg px-4 py-2"
        />
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium mb-2">Assign to:</label>
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
              className={`px-3 py-1 rounded-full border-2 ${
                selectedKids.includes(kid.id)
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'border-gray-300'
              }`}
            >
              {kid.name}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Recurring</label>
        <select
          value={recurringFrequency}
          onChange={(e) => setRecurringFrequency(e.target.value)}
          className="w-full border-2 rounded-lg px-4 py-2"
        >
          <option value="none">None</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="biweekly">Biweekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Due Date</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full border-2 rounded-lg px-4 py-2"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Applicable Days:</label>
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
              className={`px-2 py-1 rounded text-sm ${
                applicableDays.includes(idx)
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
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
          className="flex-1 bg-primary-500 text-white py-2 rounded-lg font-bold disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving...' : 'Save'}
        </button>
        <button onClick={onClose} className="flex-1 bg-gray-200 py-2 rounded-lg">
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
    <div className="bg-white rounded-xl p-4 shadow">
      <h3 className="font-bold text-lg mb-4">Add Reward</h3>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Reward name"
        className="w-full border-2 rounded-lg px-4 py-2 mb-3"
      />
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Cost (points)</label>
        <input
          type="number"
          value={cost}
          onChange={(e) => setCost(Number(e.target.value))}
          className="w-full border-2 rounded-lg px-4 py-2"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => mutation.mutate({ name, cost })}
          disabled={!name}
          className="flex-1 bg-purple-500 text-white py-2 rounded-lg font-bold disabled:opacity-50"
        >
          Add
        </button>
        <button onClick={onClose} className="flex-1 bg-gray-200 py-2 rounded-lg">
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
    <div className="bg-white rounded-xl p-4 shadow">
      <h3 className="font-bold text-lg mb-4">Edit Reward</h3>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Reward name"
        className="w-full border-2 rounded-lg px-4 py-2 mb-3"
      />
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Cost (points)</label>
        <input
          type="number"
          value={cost}
          onChange={(e) => setCost(Number(e.target.value))}
          className="w-full border-2 rounded-lg px-4 py-2"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => mutation.mutate({ name, cost })}
          disabled={!name || mutation.isPending}
          className="flex-1 bg-purple-500 text-white py-2 rounded-lg font-bold disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving...' : 'Save'}
        </button>
        <button onClick={onClose} className="flex-1 bg-gray-200 py-2 rounded-lg">
          Cancel
        </button>
      </div>
    </div>
  );
}

function AddParentForm({ kids, onClose }: { kids: Kid[]; onClose: () => void }) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [selectedKids, setSelectedKids] = useState<string[]>([]);
  const [enableNotifications, setEnableNotifications] = useState(true);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: Partial<Parent>) => parentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      onClose();
    },
  });

  return (
    <div className="bg-white rounded-xl p-4 shadow">
      <h3 className="font-bold text-lg mb-4">Add Parent</h3>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Parent name"
        className="w-full border-2 rounded-lg px-4 py-2 mb-3"
      />
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">PIN (optional, 4 digits)</label>
        <input
          type="text"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="1234"
          maxLength={4}
          className="w-full border-2 rounded-lg px-4 py-2"
        />
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium mb-2">Associated Kids:</label>
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
              className={`px-3 py-1 rounded-full border-2 ${
                selectedKids.includes(kid.id)
                  ? 'bg-green-500 text-white border-green-500'
                  : 'border-gray-300'
              }`}
            >
              {kid.name}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={enableNotifications}
            onChange={(e) => setEnableNotifications(e.target.checked)}
            className="w-5 h-5"
          />
          <span>Enable notifications</span>
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
          disabled={!name}
          className="flex-1 bg-green-500 text-white py-2 rounded-lg font-bold disabled:opacity-50"
        >
          Add
        </button>
        <button onClick={onClose} className="flex-1 bg-gray-200 py-2 rounded-lg">
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
    <div className="bg-white rounded-xl p-4 shadow">
      <h3 className="font-bold text-lg mb-4">Edit Parent</h3>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Parent name"
        className="w-full border-2 rounded-lg px-4 py-2 mb-3"
      />
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">PIN (optional, 4 digits)</label>
        <input
          type="text"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="1234"
          maxLength={4}
          className="w-full border-2 rounded-lg px-4 py-2"
        />
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium mb-2">Associated Kids:</label>
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
              className={`px-3 py-1 rounded-full border-2 ${
                selectedKids.includes(kid.id)
                  ? 'bg-green-500 text-white border-green-500'
                  : 'border-gray-300'
              }`}
            >
              {kid.name}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={enableNotifications}
            onChange={(e) => setEnableNotifications(e.target.checked)}
            className="w-5 h-5"
          />
          <span>Enable notifications</span>
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
          className="flex-1 bg-green-500 text-white py-2 rounded-lg font-bold disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving...' : 'Save'}
        </button>
        <button onClick={onClose} className="flex-1 bg-gray-200 py-2 rounded-lg">
          Cancel
        </button>
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

  const tabs: { id: Tab; label: string; icon: string; badge?: number }[] = [
    { id: 'approvals', label: 'Approve', icon: '✓', badge: pendingCount?.total },
    { id: 'kids', label: 'Kids', icon: '👧' },
    { id: 'chores', label: 'Chores', icon: '🧹' },
    { id: 'rewards', label: 'Rewards', icon: '🎁' },
    { id: 'parents', label: 'Parents', icon: '👨‍👩‍👧' },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-700">👨‍👩‍👧 Parent Dashboard</h2>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 px-4 py-2 rounded-xl font-bold whitespace-nowrap
              ${activeTab === tab.id
                ? 'bg-primary-500 text-white'
                : 'bg-white text-gray-600 border-2 border-gray-200'
              }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.badge && tab.badge > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'approvals' && <ApprovalsList />}

      {activeTab === 'kids' && (
        <div className="space-y-4">
          {editingKid ? (
            <EditKidForm kid={editingKid} onClose={() => setEditingKid(null)} />
          ) : showAddForm === 'kid' ? (
            <AddKidForm onClose={() => setShowAddForm(null)} />
          ) : (
            <button
              onClick={() => setShowAddForm('kid')}
              className="w-full bg-primary-100 text-primary-700 py-3 rounded-xl font-bold border-2 border-dashed border-primary-300"
            >
              + Add Kid
            </button>
          )}
          {kids.map((kid) => (
            <div key={kid.id} className="bg-white rounded-xl p-4 shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-bold">{kid.name}</p>
                  <p className="text-sm text-gray-500">{Math.floor(kid.points)} points</p>
                </div>
                <div className="flex gap-1 items-center">
                  <button
                    onClick={() => setEditingKid(kid)}
                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                    title="Edit"
                  >
                    <span>&#9998;</span>
                  </button>
                  <button
                    onClick={() => setDeleteConfirm({ type: 'kid', id: kid.id, name: kid.name })}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    title="Delete"
                  >
                    <span>&#128465;</span>
                  </button>
                  <span className="text-2xl ml-2">👧</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'chores' && (
        <div className="space-y-4">
          {editingChore ? (
            <EditChoreForm chore={editingChore} kids={kids} onClose={() => setEditingChore(null)} />
          ) : showAddForm === 'chore' ? (
            <AddChoreForm kids={kids} onClose={() => setShowAddForm(null)} />
          ) : (
            <button
              onClick={() => setShowAddForm('chore')}
              className="w-full bg-blue-100 text-blue-700 py-3 rounded-xl font-bold border-2 border-dashed border-blue-300"
            >
              + Add Chore
            </button>
          )}
          {chores.map((chore) => (
            <div key={chore.id} className="bg-white rounded-xl p-4 shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-bold">{chore.name}</p>
                  <p className="text-sm text-gray-500">
                    {chore.default_points} points
                    {chore.recurring_frequency && chore.recurring_frequency !== 'none' && (
                      <span className="ml-2 text-blue-500">• {chore.recurring_frequency}</span>
                    )}
                  </p>
                  {chore.assigned_kids && chore.assigned_kids.length > 0 && (
                    <p className="text-xs text-gray-400">
                      Assigned: {chore.assigned_kids.map(kidId => kids.find(k => k.id === kidId)?.name || kidId).join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 items-center">
                  <button
                    onClick={() => setEditingChore(chore)}
                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                    title="Edit"
                  >
                    <span>&#9998;</span>
                  </button>
                  <button
                    onClick={() => setDeleteConfirm({ type: 'chore', id: chore.id, name: chore.name })}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    title="Delete"
                  >
                    <span>&#128465;</span>
                  </button>
                  <span className="text-2xl ml-2">{chore.icon || '🧹'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'rewards' && (
        <div className="space-y-4">
          {editingReward ? (
            <EditRewardForm reward={editingReward} onClose={() => setEditingReward(null)} />
          ) : showAddForm === 'reward' ? (
            <AddRewardForm onClose={() => setShowAddForm(null)} />
          ) : (
            <button
              onClick={() => setShowAddForm('reward')}
              className="w-full bg-purple-100 text-purple-700 py-3 rounded-xl font-bold border-2 border-dashed border-purple-300"
            >
              + Add Reward
            </button>
          )}
          {rewards.map((reward) => (
            <div key={reward.id} className="bg-white rounded-xl p-4 shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-bold">{reward.name}</p>
                  <p className="text-sm text-gray-500">{reward.cost} points</p>
                </div>
                <div className="flex gap-1 items-center">
                  <button
                    onClick={() => setEditingReward(reward)}
                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                    title="Edit"
                  >
                    <span>&#9998;</span>
                  </button>
                  <button
                    onClick={() => setDeleteConfirm({ type: 'reward', id: reward.id, name: reward.name })}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    title="Delete"
                  >
                    <span>&#128465;</span>
                  </button>
                  <span className="text-2xl ml-2">{reward.icon || '🎁'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'parents' && (
        <div className="space-y-4">
          {editingParent ? (
            <EditParentForm parent={editingParent} kids={kids} onClose={() => setEditingParent(null)} />
          ) : showAddForm === 'parent' ? (
            <AddParentForm kids={kids} onClose={() => setShowAddForm(null)} />
          ) : (
            <button
              onClick={() => setShowAddForm('parent')}
              className="w-full bg-green-100 text-green-700 py-3 rounded-xl font-bold border-2 border-dashed border-green-300"
            >
              + Add Parent
            </button>
          )}
          {parents.map((parent) => (
            <div key={parent.id} className="bg-white rounded-xl p-4 shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-bold">{parent.name}</p>
                  <p className="text-sm text-gray-500">
                    {parent.associated_kids.length > 0
                      ? `Kids: ${parent.associated_kids.map(kidId => kids.find(k => k.id === kidId)?.name || kidId).join(', ')}`
                      : 'No kids assigned'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {parent.pin ? '🔒 PIN set' : '🔓 No PIN'}
                    {parent.enable_notifications && ' • 🔔 Notifications on'}
                  </p>
                </div>
                <div className="flex gap-1 items-center">
                  <button
                    onClick={() => setEditingParent(parent)}
                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                    title="Edit"
                  >
                    <span>&#9998;</span>
                  </button>
                  <button
                    onClick={() => setDeleteConfirm({ type: 'parent', id: parent.id, name: parent.name })}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    title="Delete"
                  >
                    <span>&#128465;</span>
                  </button>
                  <span className="text-2xl ml-2">👨‍👩‍👧</span>
                </div>
              </div>
            </div>
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
