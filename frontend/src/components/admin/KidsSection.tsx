import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, UserPlus, Pencil, Check, X, User, Mail, Link2, Unlink } from 'lucide-react';
import { kidsApi } from '../../api/client';
import type { Kid } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { FormInput } from './FormElements';
import { EntityCard } from './EntityCard';
import { DeleteConfirmModal } from './DeleteConfirmModal';

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
  const [googleEmail, setGoogleEmail] = useState(kid.google_email || '');
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
      <FormInput
        label="Google Email (for kid sign-in)"
        type="email"
        value={googleEmail}
        onChange={(e) => setGoogleEmail(e.target.value)}
        placeholder="kid@gmail.com"
      />
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => mutation.mutate({ name, google_email: googleEmail || undefined })}
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

function GoogleLinkButton({ kidId, kidName }: { kidId: string; kidName: string }) {
  const [showInput, setShowInput] = useState(false);
  const [email, setEmail] = useState('');
  const queryClient = useQueryClient();
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: (emailVal: string) => kidsApi.linkGoogle(kidId, emailVal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kids'] });
      setShowInput(false);
      setEmail('');
      toast.success(`Google linked for ${kidName}`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to link');
    },
  });

  if (!showInput) {
    return (
      <button
        onClick={() => setShowInput(true)}
        className="flex items-center gap-1 mt-1 text-xs text-primary-500 hover:text-primary-600 transition-colors"
      >
        <Link2 size={12} /> Connect Google
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 mt-1">
      <input
        type="email"
        aria-label="Google email for kid sign-in"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="kid@gmail.com"
        className="text-xs border border-[var(--border-color)] rounded px-2 py-1 bg-bg-surface text-text-primary w-40"
        autoFocus
      />
      <button
        onClick={() => mutation.mutate(email)}
        disabled={!email || mutation.isPending}
        className="p-1 text-primary-500 hover:text-primary-600"
      >
        <Check size={14} />
      </button>
      <button onClick={() => { setShowInput(false); setEmail(''); }} className="p-1 text-text-muted hover:text-error-500">
        <X size={14} />
      </button>
    </div>
  );
}

function GoogleUnlinkButton({ kidId }: { kidId: string }) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: () => kidsApi.unlinkGoogle(kidId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kids'] });
      toast.success('Google unlinked');
    },
  });

  return (
    <button
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className="p-0.5 text-text-muted hover:text-error-500 transition-colors ml-1"
      title="Unlink Google"
    >
      <Unlink size={12} />
    </button>
  );
}

export function KidsSection() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingKid, setEditingKid] = useState<Kid | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const queryClient = useQueryClient();

  const { data: kids = [] } = useQuery({
    queryKey: ['kids'],
    queryFn: () => kidsApi.list().then(res => res.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => kidsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kids'] });
      setDeleteConfirm(null);
    },
  });

  return (
    <div className="space-y-3">
      {editingKid ? (
        <EditKidForm kid={editingKid} onClose={() => setEditingKid(null)} />
      ) : showAddForm ? (
        <AddKidForm onClose={() => setShowAddForm(false)} />
      ) : (
        <button
          data-testid="add-kid-btn"
          onClick={() => setShowAddForm(true)}
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
          onDelete={() => setDeleteConfirm({ id: kid.id, name: kid.name })}
          icon={<div className="w-10 h-10 bg-bg-accent rounded-full flex items-center justify-center"><User size={20} className="text-text-muted" /></div>}
        >
          <p className="font-bold text-text-primary" data-testid={`kid-name-${kid.id}`}>{kid.name}</p>
          <p className="text-sm text-text-muted" data-testid={`kid-points-${kid.id}`}>{Math.floor(kid.points)} points</p>
          {kid.google_email ? (
            <div className="flex items-center gap-1 mt-1">
              <Mail size={12} className="text-primary-500" />
              <span className="text-xs text-text-muted">{kid.google_email}</span>
              <GoogleUnlinkButton kidId={kid.id} />
            </div>
          ) : (
            <GoogleLinkButton kidId={kid.id} kidName={kid.name} />
          )}
        </EntityCard>
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
