import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Clock, CheckCircle2, Hand, ClipboardList, RefreshCw, Flame, Calendar, List, Zap } from 'lucide-react';
import { kidsApi, choresApi, categoriesApi } from '../api/client';
import type { Chore, Kid, TodaysChore, ChoreCategory } from '../api/client';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { staggerContainer, listItemVariants } from '../utils/animations';
import { AnimatedBadge } from '../components/AnimatedBadge';
import { SkeletonChoreCardList } from '../components/skeletons';
import { PointsEarned } from '../components/celebrations/PointsEarned';
import { ConfettiBurst } from '../components/celebrations/Confetti';
import { useToast } from '../hooks/useToast';
import { CategoryBadge, CategoryFilter } from '../components/CategoryBadge';

type ChoreStatusType = 'pending' | 'claimed' | 'approved' | 'overdue' | 'expired';

const RECURRING_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
};

function RecurringBadge({ frequency }: { frequency: string }) {
  if (!frequency || frequency === 'none') return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
      <RefreshCw size={10} />
      {RECURRING_LABELS[frequency] || frequency}
    </span>
  );
}

function StreakBadge({ streak }: { streak: number }) {
  if (!streak || streak < 1) return null;

  return (
    <motion.span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <Flame size={10} />
      {streak} day{streak > 1 ? 's' : ''}
    </motion.span>
  );
}

function ChoreCard({
  chore,
  kids,
  onClaim,
  index,
  claimSuccess,
  streakCount,
  category,
  multiplier,
}: {
  chore: Chore;
  kids: Kid[];
  onClaim: (choreId: string, kidId: string) => void;
  index: number;
  claimSuccess: string | null;
  streakCount?: number;
  category?: ChoreCategory | null;
  multiplier?: number;
}) {
  const [showKidSelect, setShowKidSelect] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const assignedKidNames = chore.assigned_kids
    .map(id => kids.find(k => k.id === id)?.name || id)
    .join(', ');

  // Calculate boosted points if multiplier is active
  const basePoints = chore.default_points;
  const boostedPoints = multiplier && multiplier > 1 ? Math.round(basePoints * multiplier) : basePoints;
  const hasMultiplier = multiplier && multiplier > 1;

  const status = (chore.status || 'pending') as ChoreStatusType;
  const isSuccess = claimSuccess === chore.id;

  return (
    <motion.div
      data-testid={`chore-card-${chore.id}`}
      className={`card p-4 ${
        status === 'pending' ? '' : ''
      }`}
      variants={prefersReducedMotion ? undefined : listItemVariants}
      initial={prefersReducedMotion ? false : 'hidden'}
      animate="visible"
      whileHover={prefersReducedMotion ? {} : { x: -2, y: -2 }}
      transition={{ delay: index * 0.05 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <motion.div
            className="w-12 h-12 bg-bg-accent rounded-xl flex items-center justify-center flex-shrink-0"
            whileHover={prefersReducedMotion ? {} : { rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.3 }}
          >
            <span className="text-2xl">{chore.icon || '🧹'}</span>
          </motion.div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className="font-bold text-lg text-text-primary truncate"
                data-testid={`chore-name-${chore.id}`}
              >
                {chore.name}
              </h3>
              {category && <CategoryBadge category={category} size="sm" showName={false} />}
              <RecurringBadge frequency={chore.recurring_frequency} />
              <StreakBadge streak={streakCount || 0} />
            </div>
            <p
              className="text-sm text-text-secondary truncate"
              data-testid={`chore-assigned-${chore.id}`}
            >
              {assignedKidNames}
            </p>
          </div>
        </div>
        <motion.div
          className={`flex items-center gap-1 flex-shrink-0 px-2.5 py-1 rounded-full ${
            hasMultiplier ? 'bg-yellow-500/20' : 'bg-accent-500/10'
          }`}
          animate={isSuccess && !prefersReducedMotion ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          {hasMultiplier ? (
            <>
              <Zap size={16} className="text-yellow-500" fill="currentColor" />
              <span className="text-lg font-bold text-yellow-500" data-testid={`chore-points-${chore.id}`}>
                +{boostedPoints}
              </span>
              <span className="text-xs text-yellow-600 dark:text-yellow-400 ml-1">
                ({multiplier}x)
              </span>
            </>
          ) : (
            <>
              <Star size={18} className="text-accent-500" fill="currentColor" />
              <span className="text-lg font-bold text-accent-500" data-testid={`chore-points-${chore.id}`}>
                +{basePoints}
              </span>
            </>
          )}
        </motion.div>
      </div>

      {chore.description && (
        <p className="text-sm mt-3 text-text-muted pl-15">{chore.description}</p>
      )}

      {/* Status and Actions */}
      <div className="mt-4 flex items-center justify-between">
        <AnimatedBadge status={status} />

        {status === 'pending' && (
          <div className="relative">
            <motion.button
              data-testid={`claim-btn-${chore.id}`}
              onClick={() => setShowKidSelect(!showKidSelect)}
              className={`btn touch-target font-bold ${
                isSuccess ? 'bg-primary-500 hover:bg-primary-600' : 'btn-primary'
              }`}
              whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
              animate={
                isSuccess && !prefersReducedMotion
                  ? { scale: [1, 1.1, 1] }
                  : {}
              }
            >
              <AnimatePresence mode="wait">
                {isSuccess ? (
                  <motion.span
                    key="success"
                    className="flex items-center gap-1"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                  >
                    <CheckCircle2 size={16} />
                    Claimed!
                  </motion.span>
                ) : (
                  <motion.span
                    key="claim"
                    className="flex items-center gap-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Hand size={16} />
                    Claim!
                  </motion.span>
                )}
              </AnimatePresence>
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
                    className="absolute right-0 mt-2 rounded-xl shadow-xl p-2 z-50 min-w-[160px] bg-bg-elevated border border-bg-accent"
                    initial={prefersReducedMotion ? false : { opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <p className="text-xs px-2 py-1 text-text-muted">Who's claiming?</p>
                    {chore.assigned_kids.map((kidId, i) => {
                      const kid = kids.find(k => k.id === kidId);
                      return (
                        <motion.button
                          key={kidId}
                          onClick={() => {
                            onClaim(chore.id, kidId);
                            setShowKidSelect(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg font-medium text-text-primary hover:bg-bg-accent"
                          initial={prefersReducedMotion ? false : { opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          whileHover={prefersReducedMotion ? {} : { x: 4 }}
                        >
                          {kid?.name || kidId}
                        </motion.button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}

        {status === 'claimed' && (
          <motion.div
            className="flex items-center gap-1.5 text-sm font-medium text-status-claimed-text"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.span
              animate={prefersReducedMotion ? {} : { rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Clock size={14} />
            </motion.span>
            Waiting for approval
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

type ViewMode = 'today' | 'all';

export function Chores() {
  const queryClient = useQueryClient();
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);
  const [showPointsEarned, setShowPointsEarned] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  const [selectedKid, setSelectedKid] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const toast = useToast();

  const { data: kids = [] } = useQuery({
    queryKey: ['kids'],
    queryFn: () => kidsApi.list().then(res => res.data),
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then(res => res.data),
  });

  // Create category lookup map
  const categoryMap = useMemo(() => {
    const map = new Map<string, ChoreCategory>();
    categories.forEach(cat => map.set(cat.id, cat));
    return map;
  }, [categories]);

  // Auto-select first kid when kids load
  const activeKidId = selectedKid || (kids.length > 0 ? kids[0].id : null);

  // Fetch all chores
  const { data: allChores = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ['chores'],
    queryFn: () => choresApi.list().then(res => res.data),
  });

  // Fetch today's chores for selected kid
  const { data: todaysChores = [], isLoading: isLoadingToday } = useQuery({
    queryKey: ['chores', 'today', activeKidId],
    queryFn: () => activeKidId ? choresApi.todayForKid(activeKidId).then(res => res.data) : Promise.resolve([]),
    enabled: !!activeKidId && viewMode === 'today',
  });

  // Fetch daily progress for multiplier info
  const { data: dailyProgress } = useQuery({
    queryKey: ['daily-progress', activeKidId],
    queryFn: () => activeKidId ? kidsApi.getDailyProgress(activeKidId).then(res => res.data) : Promise.resolve(null),
    enabled: !!activeKidId && viewMode === 'today',
    refetchInterval: 30000,
  });

  // Get current multiplier
  const currentMultiplier = dailyProgress?.multiplier || 1;

  // Use appropriate chore list based on view mode, then filter by category
  const baseChores = viewMode === 'today' ? todaysChores : allChores;
  const chores = useMemo(() => {
    if (!selectedCategory) return baseChores;
    return baseChores.filter(chore => chore.category_id === selectedCategory);
  }, [baseChores, selectedCategory]);
  const isLoading = viewMode === 'today' ? isLoadingToday : isLoadingAll;

  // Create streak map from today's chores
  const streakMap = new Map<string, number>();
  todaysChores.forEach(chore => {
    if ('streak_count' in chore) {
      streakMap.set(chore.id, (chore as TodaysChore).streak_count);
    }
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
    const chore = chores.find(c => c.id === choreId);
    claimMutation.mutate({ choreId, kidId });
    setClaimSuccess(choreId);

    // Show toast notification
    if (chore) {
      toast.choreClaimed(chore.name, chore.default_points);
    }

    // Trigger celebrations
    setEarnedPoints(chore?.default_points || 0);
    setShowPointsEarned(true);
    setShowConfetti(true);

    setTimeout(() => {
      setClaimSuccess(null);
      setShowPointsEarned(false);
      setShowConfetti(false);
    }, 2500);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-bg-accent rounded animate-pulse" />
          <div className="h-7 w-32 bg-bg-accent rounded-lg animate-pulse" />
        </div>
        <SkeletonChoreCardList count={4} />
      </div>
    );
  }


  return (
    <div className="space-y-4">
      {/* Header with view toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2 text-text-primary">
          <ClipboardList size={24} className="text-primary-500" />
          {viewMode === 'today' ? "Today's Chores" : 'All Chores'}
        </h2>

        {/* View Toggle */}
        <div className="flex items-center gap-2" role="tablist" aria-label="View mode">
          <motion.button
            role="tab"
            aria-selected={viewMode === 'today'}
            onClick={() => setViewMode('today')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border-2 ${
              viewMode === 'today'
                ? 'bg-primary-500 border-primary-500 text-text-inverse'
                : 'border-[var(--border-color)] text-text-primary hover:bg-bg-elevated'
            }`}
            whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
          >
            <Calendar size={16} />
            Today
          </motion.button>
          <motion.button
            role="tab"
            aria-selected={viewMode === 'all'}
            onClick={() => setViewMode('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border-2 ${
              viewMode === 'all'
                ? 'bg-primary-500 border-primary-500 text-text-inverse'
                : 'border-[var(--border-color)] text-text-primary hover:bg-bg-elevated'
            }`}
            whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
          >
            <List size={16} />
            All
          </motion.button>
        </div>
      </div>

      {/* Kid selector for Today's view */}
      {viewMode === 'today' && kids.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Select kid">
          {kids.map(kid => (
            <motion.button
              key={kid.id}
              role="tab"
              aria-selected={activeKidId === kid.id}
              onClick={() => setSelectedKid(kid.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors border-2 ${
                activeKidId === kid.id
                  ? 'bg-accent-500 text-text-inverse border-accent-500'
                  : 'border-[var(--border-color)] text-text-primary hover:bg-bg-elevated'
              }`}
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            >
              {kid.name}
            </motion.button>
          ))}
        </div>
      )}

      {/* Daily Progress Summary for Today's view */}
      {viewMode === 'today' && activeKidId && dailyProgress && dailyProgress.total_chores > 0 && (
        <motion.div
          className="card p-4 bg-gradient-to-r from-primary-500/10 to-accent-500/10 border-primary-200 dark:border-primary-800"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative w-14 h-14">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-primary-200 dark:text-primary-800"
                  />
                  <motion.circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={97.4}
                    initial={{ strokeDashoffset: 97.4 }}
                    animate={{ strokeDashoffset: 97.4 - (97.4 * dailyProgress.completion_percentage) / 100 }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={dailyProgress.all_completed ? 'text-green-500' : 'text-primary-500'}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  {dailyProgress.all_completed ? (
                    <CheckCircle2 size={20} className="text-green-500" />
                  ) : (
                    <span className="text-sm font-bold text-text-primary">
                      {Math.round(dailyProgress.completion_percentage)}%
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="font-semibold text-text-primary">
                  {dailyProgress.completed_chores} of {dailyProgress.total_chores} chores
                </p>
                <p className="text-sm text-text-secondary">
                  {dailyProgress.all_completed
                    ? dailyProgress.bonus_awarded
                      ? `+${dailyProgress.bonus_points} bonus earned!`
                      : 'All done! Bonus at midnight'
                    : `${dailyProgress.total_chores - dailyProgress.completed_chores} remaining`
                  }
                </p>
              </div>
            </div>
            {currentMultiplier > 1 && (
              <motion.div
                className="flex items-center gap-1 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-3 py-1.5 rounded-full font-bold"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Zap size={16} fill="currentColor" />
                {currentMultiplier}x Multiplier
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="overflow-x-auto pb-2">
          <CategoryFilter
            categories={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </div>
      )}

      {/* Chore list */}
      <motion.div
        className="space-y-3"
        variants={prefersReducedMotion ? undefined : staggerContainer}
        initial={prefersReducedMotion ? false : 'hidden'}
        animate="visible"
      >
        {chores.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-text-secondary">
              {viewMode === 'today'
                ? 'No chores scheduled for today!'
                : 'No chores yet. Parents can add chores from the Parent section.'}
            </p>
          </div>
        ) : (
          chores.map((chore, index) => (
            <ChoreCard
              key={chore.id}
              chore={chore}
              kids={kids}
              onClaim={handleClaim}
              index={index}
              claimSuccess={claimSuccess}
              streakCount={streakMap.get(chore.id)}
              category={chore.category_id ? categoryMap.get(chore.category_id) : null}
              multiplier={viewMode === 'today' ? currentMultiplier : undefined}
            />
          ))
        )}
      </motion.div>

      {/* Celebration Effects */}
      <PointsEarned
        points={earnedPoints}
        show={showPointsEarned}
        onComplete={() => setShowPointsEarned(false)}
        position="center"
      />
      <ConfettiBurst show={showConfetti} onComplete={() => setShowConfetti(false)} />
    </div>
  );
}
