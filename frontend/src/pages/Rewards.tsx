import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kidsApi, rewardsApi } from '../api/client';
import type { Reward, Kid } from '../api/client';

function RewardCard({
  reward,
  kids,
  onRedeem,
}: {
  reward: Reward;
  kids: Kid[];
  onRedeem: (rewardId: string, kidId: string) => void;
}) {
  const [showKidSelect, setShowKidSelect] = useState(false);

  // Check which kids can afford this reward
  const affordableKids = kids.filter(kid => kid.points >= reward.cost);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-purple-200">
      <div className="flex items-start gap-4">
        <div className="text-5xl">{reward.icon || '🎁'}</div>
        <div className="flex-1">
          <h3 className="font-bold text-lg text-gray-800">{reward.name}</h3>
          {reward.description && (
            <p className="text-sm text-gray-500 mt-1">{reward.description}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xl font-bold text-purple-600">
              {reward.cost}⭐
            </span>
            <span className="text-sm text-gray-400">points needed</span>
          </div>
        </div>
      </div>

      <div className="mt-4 relative">
        {affordableKids.length > 0 ? (
          <>
            <button
              onClick={() => setShowKidSelect(!showKidSelect)}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white
                py-3 rounded-xl font-bold touch-target
                hover:from-purple-600 hover:to-pink-600 active:scale-95 transition-transform"
            >
              🛒 Get This!
            </button>

            {showKidSelect && (
              <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-xl p-2 z-10">
                <p className="text-xs text-gray-500 px-2 mb-1">Who's redeeming?</p>
                {affordableKids.map(kid => (
                  <button
                    key={kid.id}
                    onClick={() => {
                      onRedeem(reward.id, kid.id);
                      setShowKidSelect(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-purple-100
                      font-medium text-gray-700 flex justify-between items-center"
                  >
                    <span>{kid.name}</span>
                    <span className="text-sm text-gray-500">
                      {Math.floor(kid.points)}⭐
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-2 text-gray-400">
            <span className="text-lg">🔒</span>
            <p className="text-sm">Need more points!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function Rewards() {
  const queryClient = useQueryClient();

  const { data: kids = [] } = useQuery({
    queryKey: ['kids'],
    queryFn: () => kidsApi.list().then(res => res.data),
  });

  const { data: rewards = [], isLoading } = useQuery({
    queryKey: ['rewards'],
    queryFn: () => rewardsApi.list().then(res => res.data),
  });

  const redeemMutation = useMutation({
    mutationFn: ({ rewardId, kidId }: { rewardId: string; kidId: string }) =>
      rewardsApi.redeem(rewardId, kidId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      queryClient.invalidateQueries({ queryKey: ['kids'] });
    },
  });

  const handleRedeem = (rewardId: string, kidId: string) => {
    redeemMutation.mutate({ rewardId, kidId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-4xl animate-bounce">🎁</div>
      </div>
    );
  }

  // Show kids' points at the top
  const kidPoints = kids.map(kid => (
    <div key={kid.id} className="bg-white rounded-xl px-4 py-2 shadow">
      <span className="font-bold">{kid.name}</span>
      <span className="ml-2 text-yellow-600">{Math.floor(kid.points)}⭐</span>
    </div>
  ));

  if (rewards.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-2">{kidPoints}</div>
        <div className="text-center py-12">
          <span className="text-6xl">🏪</span>
          <h2 className="text-2xl font-bold mt-4 text-gray-700">
            Reward shop is empty!
          </h2>
          <p className="text-gray-500 mt-2">
            Parents can add rewards from the Parent section.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Points Display */}
      <div className="flex gap-2 overflow-x-auto pb-2">{kidPoints}</div>

      <h2 className="text-xl font-bold text-gray-700 flex items-center gap-2">
        <span>🏪</span> Reward Shop
      </h2>

      <div className="grid gap-4">
        {rewards.map((reward) => (
          <RewardCard
            key={reward.id}
            reward={reward}
            kids={kids}
            onRedeem={handleRedeem}
          />
        ))}
      </div>
    </div>
  );
}
