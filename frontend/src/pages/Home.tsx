import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Star, Award, User, AlertCircle } from 'lucide-react';
import { kidsApi } from '../api/client';
import type { Kid } from '../api/client';
import { useTheme } from '../theme';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { staggerContainer, cardVariants, smoothTransition } from '../utils/animations';
import { AnimatedPoints } from '../components/AnimatedPoints';
import { SkeletonKidCardList } from '../components/skeletons';
import { LevelBadge } from '../components/gamification/LevelBadge';
import { ChorbiePresets } from '../components/mascot';
import { DailyProgress } from '../components/DailyProgress';
import { StreakDisplay } from '../components/StreakDisplay';

function KidCard({ kid, index }: { kid: Kid; index: number }) {
  const { getKidColor } = useTheme();
  const kidColor = getKidColor(kid.id, kid.name);
  const prefersReducedMotion = useReducedMotion();

  const cardMotionProps = prefersReducedMotion
    ? {}
    : {
        variants: cardVariants,
        initial: 'hidden',
        animate: 'visible',
        whileHover: 'hover',
        whileTap: 'tap',
        custom: index,
        transition: { delay: index * 0.1, ...smoothTransition },
      };

  return (
    <motion.div
      data-testid={`kid-card-${kid.id}`}
      className={`bg-gradient-to-br ${kidColor.gradient} rounded-2xl p-6 text-white shadow-lg`}
      {...cardMotionProps}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <motion.h2
            className="text-2xl font-bold"
            data-testid={`kid-name-${kid.id}`}
            initial={prefersReducedMotion ? false : { opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 + 0.1 }}
          >
            {kid.name}
          </motion.h2>
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 + 0.15, type: 'spring', stiffness: 400 }}
          >
            <LevelBadge
              points={Math.floor(kid.points)}
              size="sm"
              showProgress={false}
              showName={false}
            />
          </motion.div>
        </div>
        <motion.div
          className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
          initial={prefersReducedMotion ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.1 + 0.2, type: 'spring', stiffness: 400 }}
        >
          <User size={24} />
        </motion.div>
      </div>

      {/* Points Display */}
      <motion.div
        className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-4"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 + 0.15 }}
      >
        <div className="text-center">
          <span className="text-5xl font-bold text-white" data-testid={`kid-points-${kid.id}`}>
            <AnimatedPoints value={Math.floor(kid.points)} size="xl" showIcon={false} className="justify-center text-white" />
          </span>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <Star size={18} className="text-yellow-300" fill="currentColor" />
            <span className="text-lg opacity-90">Points</span>
          </div>
          <div className="text-sm mt-1 opacity-75">
            = ${(kid.points / 100).toFixed(2)} allowance
          </div>
        </div>
      </motion.div>

      {/* Daily Progress */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 + 0.2 }}
      >
        <DailyProgress kidId={kid.id} compact />
      </motion.div>

      {/* Streak Display */}
      <motion.div
        className="mt-3"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 + 0.25 }}
      >
        <StreakDisplay kidId={kid.id} compact />
      </motion.div>

      {/* Badges */}
      {kid.badges && kid.badges.length > 0 && (
        <motion.div
          className="mt-4 pt-4 border-t border-white/20"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.1 + 0.3 }}
        >
          <p className="text-sm opacity-90 mb-2 flex items-center gap-1.5">
            <Award size={14} />
            Badges
          </p>
          <div className="flex gap-2">
            {kid.badges.map((_badge, i) => (
              <motion.div
                key={i}
                className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"
                initial={prefersReducedMotion ? false : { scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: index * 0.1 + 0.3 + i * 0.1, type: 'spring' }}
                whileHover={prefersReducedMotion ? {} : { scale: 1.2, rotate: 10 }}
              >
                <Award size={18} className="text-yellow-300" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export function Home() {
  const { data: kids, isLoading, error } = useQuery({
    queryKey: ['kids'],
    queryFn: () => kidsApi.list().then(res => res.data),
  });
  // Must call all hooks before any conditional returns (React Rules of Hooks)
  const prefersReducedMotion = useReducedMotion();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 mx-auto bg-bg-accent rounded-lg animate-pulse" />
        <SkeletonKidCardList count={2} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-4 flex items-start gap-3 bg-status-overdue-bg border border-status-overdue-border">
        <AlertCircle size={20} className="text-status-overdue-text flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-status-overdue-text">Oops! Something went wrong.</p>
          <p className="text-sm text-status-overdue-text opacity-80">Make sure the backend is running.</p>
        </div>
      </div>
    );
  }

  if (!kids || kids.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto mb-4">
          <ChorbiePresets.EmptyState />
        </div>
        <h2 className="text-2xl font-bold text-text-primary">No kids yet!</h2>
        <p className="mt-2 text-text-secondary">
          Add kids from the Parent section to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        className="flex items-center justify-center gap-3"
        initial={prefersReducedMotion ? false : { opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <ChorbiePresets.Welcome size={40} />
        <h2 className="text-xl font-bold text-text-primary">
          Welcome back!
        </h2>
      </motion.div>

      <motion.div
        className="grid gap-6"
        variants={prefersReducedMotion ? undefined : staggerContainer}
        initial={prefersReducedMotion ? false : 'hidden'}
        animate="visible"
      >
        {kids.map((kid, index) => (
          <KidCard key={kid.id} kid={kid} index={index} />
        ))}
      </motion.div>
    </div>
  );
}
