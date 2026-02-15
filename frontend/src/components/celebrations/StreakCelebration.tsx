import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Trophy, Crown, Star, Zap, X } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { Confetti } from './Confetti';

interface StreakMilestone {
  days: number;
  title: string;
  message: string;
  icon: React.ElementType;
  color: string;
  gradient: string;
}

const milestones: StreakMilestone[] = [
  {
    days: 3,
    title: 'On Fire!',
    message: "You've done chores 3 days in a row!",
    icon: Flame,
    color: 'text-orange-500',
    gradient: 'from-orange-400 to-red-500',
  },
  {
    days: 7,
    title: 'Week Warrior!',
    message: 'A whole week of completed chores!',
    icon: Zap,
    color: 'text-yellow-500',
    gradient: 'from-yellow-400 to-orange-500',
  },
  {
    days: 14,
    title: 'Super Star!',
    message: 'Two weeks of awesome work!',
    icon: Star,
    color: 'text-purple-500',
    gradient: 'from-purple-400 to-pink-500',
  },
  {
    days: 30,
    title: 'Champion!',
    message: 'A whole month of dedication!',
    icon: Trophy,
    color: 'text-blue-500',
    gradient: 'from-blue-400 to-indigo-500',
  },
  {
    days: 100,
    title: 'Legend!',
    message: '100 days of being amazing!',
    icon: Crown,
    color: 'text-amber-500',
    gradient: 'from-amber-400 to-yellow-500',
  },
];

interface StreakCelebrationProps {
  streakDays: number;
  kidName: string;
  show: boolean;
  onClose: () => void;
}

/**
 * Streak milestone celebration modal
 * Shows when kid reaches 3, 7, 14, 30, or 100 day streaks
 */
export function StreakCelebration({
  streakDays,
  kidName,
  show,
  onClose,
}: StreakCelebrationProps) {
  const prefersReducedMotion = useReducedMotion();

  // Find matching milestone
  const milestone = milestones.find((m) => m.days === streakDays);
  if (!milestone) return null;

  const Icon = milestone.icon;

  return (
    <AnimatePresence>
      {show && (
        <>
          <Confetti show={show} />

          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className="bg-bg-elevated rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-bg-accent transition-colors"
                aria-label="Close"
              >
                <X size={20} className="text-text-muted" />
              </button>

              {/* Animated icon */}
              <motion.div
                className={`w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br ${milestone.gradient} flex items-center justify-center shadow-lg`}
                animate={
                  prefersReducedMotion
                    ? {}
                    : {
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0],
                      }
                }
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
              >
                <Icon size={48} className="text-white" />
              </motion.div>

              {/* Title */}
              <motion.h2
                className={`text-3xl font-bold mb-2 bg-gradient-to-r ${milestone.gradient} bg-clip-text text-transparent`}
                initial={prefersReducedMotion ? false : { y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {milestone.title}
              </motion.h2>

              {/* Kid name */}
              <motion.p
                className="text-xl font-semibold text-text-primary mb-2"
                initial={prefersReducedMotion ? false : { y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {kidName}
              </motion.p>

              {/* Message */}
              <motion.p
                className="text-text-secondary mb-6"
                initial={prefersReducedMotion ? false : { y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {milestone.message}
              </motion.p>

              {/* Streak count */}
              <motion.div
                className="inline-flex items-center gap-2 bg-bg-accent px-6 py-3 rounded-full mb-6"
                initial={prefersReducedMotion ? false : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
              >
                <Flame size={24} className="text-orange-500" />
                <span className="text-2xl font-bold text-text-primary">
                  {streakDays} Day Streak!
                </span>
              </motion.div>

              {/* Dismiss button */}
              <motion.button
                onClick={onClose}
                className={`w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r ${milestone.gradient} shadow-lg`}
                whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                initial={prefersReducedMotion ? false : { y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                Awesome!
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Check if a streak count is a milestone
 */
export function isMilestoneStreak(days: number): boolean {
  return milestones.some((m) => m.days === days);
}

/**
 * Get milestone info for a given streak
 */
export function getMilestone(days: number): StreakMilestone | undefined {
  return milestones.find((m) => m.days === days);
}

export default StreakCelebration;
