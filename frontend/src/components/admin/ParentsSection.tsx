import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, UserPlus, Pencil, Users, Lock, Unlock, Bell } from 'lucide-react';
import { kidsApi, parentsApi } from '../../api/client';
import type { Kid, Parent } from '../../api/client';
import { FormInput } from './FormElements';
import { EntityCard } from './EntityCard';
import { DeleteConfirmModal } from './DeleteConfirmModal';

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

export function ParentsSection() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const editFormRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: kids = [] } = useQuery({
    queryKey: ['kids'],
    queryFn: () => kidsApi.list().then(res => res.data),
  });

  const { data: parents = [] } = useQuery({
    queryKey: ['parents'],
    queryFn: () => parentsApi.list().then(res => res.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => parentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      setDeleteConfirm(null);
    },
  });

  useEffect(() => {
    if (editingParent && editFormRef.current) {
      editFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [editingParent]);

  return (
    <div className="space-y-3">
      {showAddForm ? (
        <AddParentForm kids={kids} onClose={() => setShowAddForm(false)} />
      ) : (
        <button
          data-testid="add-parent-btn"
          onClick={() => { setShowAddForm(true); setEditingParent(null); }}
          className="w-full border-2 border-dashed border-status-approved-border text-status-approved-text py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-status-approved-bg transition-colors"
        >
          <Plus size={20} /> Add Parent
        </button>
      )}
      {parents.map((parent) => (
        editingParent?.id === parent.id ? (
          <div key={parent.id} ref={editFormRef}>
            <EditParentForm parent={parent} kids={kids} onClose={() => setEditingParent(null)} />
          </div>
        ) : (
          <EntityCard
            key={parent.id}
            testId={`entity-parent-${parent.id}`}
            onEdit={() => { setEditingParent(parent); setShowAddForm(false); }}
            onDelete={() => setDeleteConfirm({ id: parent.id, name: parent.name })}
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
