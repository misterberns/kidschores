import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kidsApi, choresApi } from '../api/client';
import type { Chore, Kid } from '../api/client';

function ChoreCard({
  chore,
  kids,
  onClaim,
}: {
  chore: Chore;
  kids: Kid[];
  onClaim: (choreId: string, kidId: string) => void;
}) {
  const [showKidSelect, setShowKidSelect] = useState(false);
  const assignedKidNames = chore.assigned_kids
    .map(id => kids.find(k => k.id === id)?.name || id)
    .join(', ');

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 border-yellow-400',
    claimed: 'bg-blue-100 border-blue-400',
    approved: 'bg-green-100 border-green-400',
    overdue: 'bg-red-100 border-red-400',
  };

  const status = chore.status || 'pending';

  return (
    <div className={`rounded-2xl p-4 border-2 ${statusColors[status]} shadow-md`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{chore.icon || '🧹'}</span>
          <div>
            <h3 className="font-bold text-lg text-gray-800">{chore.name}</h3>
            <p className="text-sm text-gray-600">{assignedKidNames}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-yellow-600">
            +{chore.default_points}⭐
          </span>
        </div>
      </div>

      {chore.description && (
        <p className="text-sm text-gray-500 mt-2">{chore.description}</p>
      )}

      {/* Status Badge */}
      <div className="mt-3 flex items-center justify-between">
        <span className={`text-xs font-bold px-3 py-1 rounded-full
          ${status === 'pending' ? 'bg-yellow-200 text-yellow-800' : ''}
          ${status === 'claimed' ? 'bg-blue-200 text-blue-800' : ''}
          ${status === 'approved' ? 'bg-green-200 text-green-800' : ''}
          ${status === 'overdue' ? 'bg-red-200 text-red-800' : ''}
        `}>
          {status.toUpperCase()}
        </span>

        {status === 'pending' && (
          <div className="relative">
            <button
              onClick={() => setShowKidSelect(!showKidSelect)}
              className="bg-primary-500 text-white px-4 py-2 rounded-xl font-bold touch-target
                hover:bg-primary-600 active:scale-95 transition-transform"
            >
              ✋ Claim!
            </button>

            {showKidSelect && (
              <div className="absolute right-0 mt-2 bg-white rounded-xl shadow-xl p-2 z-10 min-w-[150px]">
                <p className="text-xs text-gray-500 px-2 mb-1">Who's claiming?</p>
                {chore.assigned_kids.map(kidId => {
                  const kid = kids.find(k => k.id === kidId);
                  return (
                    <button
                      key={kidId}
                      onClick={() => {
                        onClaim(chore.id, kidId);
                        setShowKidSelect(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-primary-100
                        font-medium text-gray-700"
                    >
                      {kid?.name || kidId}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {status === 'claimed' && (
          <span className="text-sm text-blue-600 font-medium">
            Waiting for approval ⏳
          </span>
        )}
      </div>
    </div>
  );
}

export function Chores() {
  const queryClient = useQueryClient();

  const { data: kids = [] } = useQuery({
    queryKey: ['kids'],
    queryFn: () => kidsApi.list().then(res => res.data),
  });

  const { data: chores = [], isLoading } = useQuery({
    queryKey: ['chores'],
    queryFn: () => choresApi.list().then(res => res.data),
  });

  const claimMutation = useMutation({
    mutationFn: ({ choreId, kidId }: { choreId: string; kidId: string }) =>
      choresApi.claim(choreId, kidId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores'] });
      queryClient.invalidateQueries({ queryKey: ['kids'] });
    },
  });

  const handleClaim = (choreId: string, kidId: string) => {
    claimMutation.mutate({ choreId, kidId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-4xl animate-spin">🧹</div>
      </div>
    );
  }

  if (chores.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="text-6xl">📝</span>
        <h2 className="text-2xl font-bold mt-4 text-gray-700">No chores yet!</h2>
        <p className="text-gray-500 mt-2">
          Parents can add chores from the Parent section.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-700 flex items-center gap-2">
        <span>📋</span> Today's Chores
      </h2>

      <div className="space-y-4">
        {chores.map((chore) => (
          <ChoreCard
            key={chore.id}
            chore={chore}
            kids={kids}
            onClaim={handleClaim}
          />
        ))}
      </div>
    </div>
  );
}
