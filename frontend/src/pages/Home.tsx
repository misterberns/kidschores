import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { Award, AlertCircle, Sparkle } from 'lucide-react';
import { kidsApi } from '../api/client';
import { useAuth } from '../auth';
import type { Kid } from '../api/client';
import { useTheme } from '../theme';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { staggerContainer, cardVariants, smoothTransition } from '../utils/animations';
import { AnimatedPoints } from '../components/AnimatedPoints';
import { SkeletonKidCardList } from '../components/skeletons';
import { LevelBadge } from '../components/gamification/LevelBadge';
import { DailyProgress } from '../components/DailyProgress';
import { StreakDisplay } from '../components/StreakDisplay';
import { BadgeDisplay } from '../components/gamification/BadgeDisplay';
import { BadgeCelebration } from '../components/celebrations/BadgeCelebration';
import { GoalCelebration } from '../components/celebrations/GoalCelebration';
import { GoalRing, useGoals } from '../components/goals/GoalRing';
import type { SavingsGoal } from '../api/client';
import { InstallAppBanner } from '../components/InstallAppBanner';

function KidCard({ kid, index }: { kid: Kid; index: number }) {
  const { getKidColor } = useTheme();
  const kidColor = getKidColor(kid.id, kid.name);
  const prefersReducedMotion = useReducedMotion();
  // Shared with GoalRing (same query key — one fetch): supplies the kid's REAL
  // points_per_dollar for the $ line, which was hardcoded /100 before v0.16.
  const { data: goalsData } = useGoals(kid.id);
  const pointsPerDollar = goalsData?.points_per_dollar ?? 100;

  const cardMotionProps = prefersReducedMotion
    ? {}
    : {
        variants: cardVariants,
        initial: 'hidden',
        animate: 'visible',
        whileHover: 'hover',
        whileTap: 'tap',
        custom: index,
        transition: { delay: index * 0.06, ...smoothTransition },
      };

  return (
    <motion.div
      data-testid={`kid-card-${kid.id}`}
      className={`kid-card ${kidColor.className} p-5`}
      {...cardMotionProps}
    >
      {/* Header: avatar ring + name + level, streak on the right */}
      <div className="flex items-center gap-3 mb-4">
        <div
          aria-hidden="true"
          className="kid-avatar-ring w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-lg"
        >
          {kid.name.charAt(0).toUpperCase()}
        </div>
        <h2
          className="text-xl font-bold text-text-primary"
          data-testid={`kid-name-${kid.id}`}
        >
          {kid.name}
        </h2>
        <LevelBadge
          points={Math.floor(kid.points)}
          size="sm"
          showProgress={false}
          showName={false}
        />
        <div className="ml-auto">
          <StreakDisplay kidId={kid.id} compact />
        </div>
      </div>

      {/* Points — accent-tinted display numerals */}
      <div className="flex items-baseline gap-2">
        <span
          className="stat-number text-5xl font-bold kid-accent-text"
          data-testid={`kid-points-${kid.id}`}
        >
          <AnimatedPoints value={Math.floor(kid.points)} size="xl" showIcon={false} />
        </span>
        <span className="text-sm font-medium text-text-muted">pts</span>
      </div>
      <p className="text-xs text-text-muted mt-0.5 mb-4">
        = ${(kid.points / pointsPerDollar).toFixed(2)} allowance
      </p>

      {/* Today's progress ring */}
      <DailyProgress kidId={kid.id} compact />

      {/* Savings goal ring (nearest-complete active goal) */}
      <GoalRing kidId={kid.id} />

      {/* Badges */}
      {kid.badges && kid.badges.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border-primary">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2 flex items-center gap-1.5">
            <Award size={13} />
            Badges
          </p>
          <BadgeDisplay badges={kid.badges} size="sm" maxDisplay={6} />
        </div>
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
  const { role, kidId } = useAuth();
  // Kid sessions see ONLY their own card. The backend now filters /api/kids
  // for kid-linked accounts too — this is belt-and-braces so a stale cached
  // list can never fan out sibling queries (require_kid_access 403s them,
  // which was the v0.14.0 tablet toast storm).
  const visibleKids = role === 'kid' && kidId ? (kids ?? []).filter(k => k.id === kidId) : (kids ?? []);

  // Badge-unlock celebration: on the kid's own device, fire when their badge
  // list grows past the last-seen count (persisted per device).
  const [celebrateBadges, setCelebrateBadges] = useState<string[]>([]);
  const ownKid = role === 'kid' && kidId ? kids?.find(k => k.id === kidId) : undefined;
  useEffect(() => {
    if (!ownKid) return;
    const key = `kidschores-badges-seen-${ownKid.id}`;
    const seen = parseInt(localStorage.getItem(key) || '0', 10);
    const earned = ownKid.badges || [];
    if (earned.length > seen) {
      setCelebrateBadges(earned.slice(seen));
    } else if (earned.length < seen) {
      // badges can shrink if a custom badge is deleted — resync silently
      localStorage.setItem(key, String(earned.length));
    }
  }, [ownKid?.id, ownKid?.badges?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismissBadgeCelebration = () => {
    if (ownKid) {
      localStorage.setItem(`kidschores-badges-seen-${ownKid.id}`, String((ownKid.badges || []).length));
    }
    setCelebrateBadges([]);
  };

  // Savings-goal celebration: on the kid's own device, fire once per goal when
  // it first reaches its target (per-device localStorage flag — same pattern
  // as the badge watcher above). Balance can later drop below target again;
  // the flag persists so there's no re-celebration.
  const { data: ownGoalsData } = useGoals(ownKid?.id);
  const [celebrateGoal, setCelebrateGoal] = useState<SavingsGoal | null>(null);
  useEffect(() => {
    if (!ownKid || !ownGoalsData) return;
    const reached = ownGoalsData.goals.find(
      g => g.status === 'active' && g.reached &&
        localStorage.getItem(`kidschores-goal-celebrated-${g.id}`) !== '1'
    );
    if (reached) setCelebrateGoal(reached);
  }, [ownKid?.id, ownGoalsData]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismissGoalCelebration = () => {
    if (celebrateGoal) {
      localStorage.setItem(`kidschores-goal-celebrated-${celebrateGoal.id}`, '1');
    }
    setCelebrateGoal(null);
  };

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
    // Redirect parents to onboarding wizard; kids see a simple message
    if (role === 'parent') {
      return <Navigate to="/onboarding" replace />;
    }
    return (
      <div className="text-center py-12">
        <Sparkle size={40} className="mx-auto mb-4 text-primary-500" aria-hidden="true" />
        <h2 className="text-2xl font-bold text-text-primary">No kids yet!</h2>
        <p className="mt-2 text-text-secondary">
          Ask a parent to set things up.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <InstallAppBanner />
      <BadgeCelebration
        badgeIds={celebrateBadges}
        kidName={ownKid?.name || ''}
        show={celebrateBadges.length > 0}
        onClose={dismissBadgeCelebration}
      />
      {ownKid && (
        <GoalCelebration
          goal={celebrateGoal}
          kidId={ownKid.id}
          kidName={ownKid.name}
          pointsPerDollar={ownGoalsData?.points_per_dollar ?? 100}
          show={celebrateGoal !== null && celebrateBadges.length === 0}
          onClose={dismissGoalCelebration}
        />
      )}
      <motion.h2
        className="text-2xl font-bold text-text-primary text-center"
        initial={prefersReducedMotion ? false : { opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        Welcome back!
      </motion.h2>

      <motion.div
        className={`grid gap-6 md:items-start ${visibleKids.length > 1 ? 'md:grid-cols-2' : 'md:max-w-xl md:mx-auto'}`}
        variants={prefersReducedMotion ? undefined : staggerContainer}
        initial={prefersReducedMotion ? false : 'hidden'}
        animate="visible"
      >
        {visibleKids.map((kid, index) => (
          <KidCard key={kid.id} kid={kid} index={index} />
        ))}
      </motion.div>
    </div>
  );
}
