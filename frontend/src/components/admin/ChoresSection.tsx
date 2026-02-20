import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil } from 'lucide-react';
import { kidsApi, choresApi, parentsApi } from '../../api/client';
import type { Kid, Chore, Parent } from '../../api/client';
import { DynamicIcon } from '../DynamicIcon';
import { FormInput, FormSelect } from './FormElements';
import { EntityCard } from './EntityCard';
import { DeleteConfirmModal } from './DeleteConfirmModal';

function AddChoreForm({ kids, parents, onClose }: { kids: Kid[]; parents: Parent[]; onClose: () => void }) {
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
        {parents.length > 0 && (
          <>
            <p className="text-xs text-text-muted mt-2 mb-1">Adults:</p>
            <div className="flex gap-2 flex-wrap">
              {parents.map((parent) => (
                <button
                  key={parent.id}
                  type="button"
                  onClick={() => {
                    setSelectedKids(prev =>
                      prev.includes(parent.id)
                        ? prev.filter(id => id !== parent.id)
                        : [...prev, parent.id]
                    );
                  }}
                  className="px-3 py-1.5 rounded-full border-2 font-medium transition-colors"
                  style={{
                    backgroundColor: selectedKids.includes(parent.id) ? 'var(--primary-500)' : 'var(--bg-accent)',
                    borderColor: selectedKids.includes(parent.id) ? 'var(--primary-500)' : 'var(--bg-accent)',
                    color: selectedKids.includes(parent.id) ? 'var(--text-inverse)' : 'var(--text-secondary)'
                  }}
                >
                  {parent.name}
                </button>
              ))}
            </div>
          </>
        )}
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

function EditChoreForm({ chore, kids, parents, onClose }: { chore: Chore; kids: Kid[]; parents: Parent[]; onClose: () => void }) {
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
        {parents.length > 0 && (
          <>
            <p className="text-xs text-text-muted mt-2 mb-1">Adults:</p>
            <div className="flex gap-2 flex-wrap">
              {parents.map((parent) => (
                <button
                  key={parent.id}
                  type="button"
                  onClick={() => {
                    setSelectedKids(prev =>
                      prev.includes(parent.id)
                        ? prev.filter(id => id !== parent.id)
                        : [...prev, parent.id]
                    );
                  }}
                  className="px-3 py-1.5 rounded-full border-2 font-medium transition-colors"
                  style={{
                    backgroundColor: selectedKids.includes(parent.id) ? 'var(--primary-500)' : 'var(--bg-accent)',
                    borderColor: selectedKids.includes(parent.id) ? 'var(--primary-500)' : 'var(--bg-accent)',
                    color: selectedKids.includes(parent.id) ? 'var(--text-inverse)' : 'var(--text-secondary)'
                  }}
                >
                  {parent.name}
                </button>
              ))}
            </div>
          </>
        )}
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

export function ChoresSection() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const editFormRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: kids = [] } = useQuery({
    queryKey: ['kids'],
    queryFn: () => kidsApi.list().then(res => res.data),
  });

  const { data: chores = [] } = useQuery({
    queryKey: ['chores'],
    queryFn: () => choresApi.list().then(res => res.data),
  });

  const { data: parents = [] } = useQuery({
    queryKey: ['parents'],
    queryFn: () => parentsApi.list().then(res => res.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => choresApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores'] });
      setDeleteConfirm(null);
    },
  });

  useEffect(() => {
    if (editingChore && editFormRef.current) {
      editFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [editingChore]);

  return (
    <div className="space-y-3">
      {showAddForm ? (
        <AddChoreForm kids={kids} parents={parents} onClose={() => setShowAddForm(false)} />
      ) : (
        <button
          data-testid="add-chore-btn"
          onClick={() => { setShowAddForm(true); setEditingChore(null); }}
          className="w-full border-2 border-dashed border-status-claimed-border text-status-claimed-text py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-status-claimed-bg transition-colors"
        >
          <Plus size={20} /> Add Chore
        </button>
      )}
      {chores.map((chore) => (
        editingChore?.id === chore.id ? (
          <div key={chore.id} ref={editFormRef}>
            <EditChoreForm chore={chore} kids={kids} parents={parents} onClose={() => setEditingChore(null)} />
          </div>
        ) : (
          <EntityCard
            key={chore.id}
            testId={`entity-chore-${chore.id}`}
            onEdit={() => { setEditingChore(chore); setShowAddForm(false); }}
            onDelete={() => setDeleteConfirm({ id: chore.id, name: chore.name })}
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
                Assigned: {chore.assigned_kids.map(id =>
                  kids.find(k => k.id === id)?.name ||
                  parents.find(p => p.id === id)?.name ||
                  id
                ).join(', ')}
              </p>
            )}
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
