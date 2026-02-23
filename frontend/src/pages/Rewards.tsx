import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ShoppingBag, Lock } from 'lucide-react';
import { DynamicIcon } from '../components/DynamicIcon';
import { kidsApi, rewardsApi } from '../api/client';
import type { Reward, Kid } from '../api/client';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { staggerContainer, listItemVariants } from '../utils/animations';
import { AnimatedPoints } from '../components/AnimatedPoints';
import { ConfettiBurst } from '../components/celebrations/Confetti';
import { SkeletonChoreCardList } from '../components/skeletons';
import { ChorbieAnimated } from '../components/mascot';
import { useToast } from '../hooks/useToast';

function RewardCard({
  reward,
  kids,
  onRedeem,
  index,
}: {
  reward: Reward;
  kids: Kid[];
  onRedeem: (rewardId: string, kidId: string) => void;
  index: number;
}) {
  const [showKidSelect, setShowKidSelect] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Check which kids can afford this reward
  const affordableKids = kids.filter(kid => kid.points >= reward.cost);

  return (
    <motion.div
      data-testid={`reward-card-${reward.id}`}
      className="card p-4"
      variants={prefersReducedMotion ? undefined : listItemVariants}
      initial={prefersReducedMotion ? false : 'hidden'}
      animate="visible"
      whileHover={prefersReducedMotion ? {} : { x: -2, y: -2 }}
      whileTap={prefersReducedMotion ? {} : { scale: 0.99 }}
      transition={{ delay: index * 0.05 }}
    >
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 bg-gradient-to-br from-accent-500 to-accent-400 rounded-lg border border-[var(--border-color)] flex items-center justify-center flex-shrink-0 shadow-sm">
          <DynamicIcon icon={reward.icon || 'mdi:gift'} size={32} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg text-text-primary" data-testid={`reward-name-${reward.id}`}>
            {reward.name}
          </h3>
          {reward.description && (
            <p className="text-sm mt-1 text-text-secondary line-clamp-2">{reward.description}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center gap-1 bg-accent-500/10 px-2 py-0.5 rounded-full">
              <Star size={18} className="text-accent-500" fill="currentColor" />
              <span className="text-xl font-bold text-accent-500" data-testid={`reward-cost-${reward.id}`}>
                {reward.cost}
              </span>
            </div>
            <span className="text-sm text-text-muted">points needed</span>
          </div>
        </div>
      </div>

      <div className="mt-4 relative">
        {affordableKids.length > 0 ? (
          <>
            <motion.button
              data-testid={`redeem-btn-${reward.id}`}
              onClick={() => setShowKidSelect(!showKidSelect)}
              className="w-full bg-gradient-to-r from-accent-500 to-accent-400 text-white
                py-3 rounded-xl font-bold touch-target flex items-center justify-center gap-2
                hover:from-accent-600 hover:to-accent-500 shadow-md"
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            >
              <ShoppingBag size={18} />
              Get This!
            </motion.button>

            <AnimatePresence>
              {showKidSelect && (
                <>
                  <motion.div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowKidSelect(false)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                  <motion.div
                    className="absolute left-0 right-0 mt-2 rounded-xl shadow-xl p-2 z-50 bg-bg-elevated border border-bg-accent"
                    initial={prefersReducedMotion ? false : { opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <p className="text-xs px-2 py-1 text-text-muted">Who's redeeming?</p>
                    {affordableKids.map((kid, i) => (
                      <motion.button
                        key={kid.id}
                        onClick={() => {
                          onRedeem(reward.id, kid.id);
                          setShowKidSelect(false);
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-lg font-medium flex justify-between items-center text-text-primary hover:bg-bg-accent"
                        initial={prefersReducedMotion ? false : { opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={prefersReducedMotion ? {} : { x: 4 }}
                      >
                        <span>{kid.name}</span>
                        <div className="flex items-center gap-1 text-sm text-text-muted">
                          <Star size={14} className="text-yellow-500" fill="currentColor" />
                          {Math.floor(kid.points)}
                        </div>
                      </motion.button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </>
        ) : (
          <motion.div
            className="text-center py-3 bg-bg-accent rounded-xl"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-center justify-center gap-2 text-text-muted">
              <Lock size={18} />
              <span className="font-medium">Need more points!</span>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export function Rewards() {
  const queryClient = useQueryClient();
  const [showConfetti, setShowConfetti] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const toast = useToast();

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
    onSuccess: (_data, { rewardId }) => {
      const reward = rewards.find(r => r.id === rewardId);
      if (reward) {
        toast.rewardRedeemed(reward.name, reward.cost);
      }
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      queryClient.invalidateQueries({ queryKey: ['kids'] });
      // Trigger celebration on successful redemption
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2500);
    },
  });

  const handleRedeem = (rewardId: string, kidId: string) => {
    redeemMutation.mutate({ rewardId, kidId });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[1, 2].map(i => (
            <div key={i} className="card px-4 py-2.5 flex items-center gap-2 flex-shrink-0">
              <div className="w-16 h-4 bg-bg-accent rounded animate-pulse" />
            </div>
          ))}
        </div>
        <SkeletonChoreCardList count={3} />
      </div>
    );
  }

  // Show kids' points at the top with animations
  const kidPoints = kids.map((kid, index) => (
    <motion.div
      key={kid.id}
      className="card px-4 py-2.5 flex items-center gap-2 flex-shrink-0"
      initial={prefersReducedMotion ? false : { opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <span className="font-bold text-text-primary">{kid.name}</span>
      <AnimatedPoints value={Math.floor(kid.points)} size="sm" />
    </motion.div>
  ));

  if (rewards.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-2">{kidPoints}</div>
        <div className="text-center py-12">
          <div className="mx-auto mb-4">
            <ChorbieAnimated expression="thinking" animation="float" size={100} />
          </div>
          <h2 className="text-2xl font-bold text-text-primary">
            Reward shop is empty!
          </h2>
          <p className="mt-2 text-text-secondary">
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

      <motion.h2
        className="text-xl font-bold flex items-center gap-2 text-text-primary"
        initial={prefersReducedMotion ? false : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <ShoppingBag size={24} className="text-accent-500" />
        Reward Shop
      </motion.h2>

      <motion.div
        className="grid gap-4"
        variants={prefersReducedMotion ? undefined : staggerContainer}
        initial={prefersReducedMotion ? false : 'hidden'}
        animate="visible"
      >
        {rewards.map((reward, index) => (
          <RewardCard
            key={reward.id}
            reward={reward}
            kids={kids}
            onRedeem={handleRedeem}
            index={index}
          />
        ))}
      </motion.div>

      {/* Celebration Effects */}
      <ConfettiBurst show={showConfetti} onComplete={() => setShowConfetti(false)} />
    </div>
  );
}
