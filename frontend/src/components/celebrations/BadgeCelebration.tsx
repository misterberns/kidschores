import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { Confetti } from './Confetti';
import { Badge, getBadgeInfo } from '../gamification/BadgeDisplay';

interface BadgeCelebrationProps {
  badgeIds: string[];
  kidName: string;
  show: boolean;
  onClose: () => void;
}

/**
 * Full-screen celebration when a kid unlocks new badges (mirrors
 * StreakCelebration). Fires on the kid's own device when their badge list
 * grows past the last-seen count.
 */
export function BadgeCelebration({ badgeIds, kidName, show, onClose }: BadgeCelebrationProps) {
  const prefersReducedMotion = useReducedMotion();
  if (badgeIds.length === 0) return null;

  const first = getBadgeInfo(badgeIds[0]);
  const title = badgeIds.length > 1 ? `${badgeIds.length} new badges!` : first?.name ?? 'New badge!';

  return (
    <AnimatePresence>
      {show && (
        <>
          <Confetti show={show} />

          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div
              role="dialog"
              aria-label="Badge unlocked"
              className="bg-bg-elevated rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-bg-accent transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-500/40"
                aria-label="Close"
              >
                <X size={20} className="text-text-muted" />
              </button>

              <p className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-4">
                Badge unlocked
              </p>

              <motion.div
                className="flex items-center justify-center gap-3 mb-6"
                animate={prefersReducedMotion ? {} : { scale: [1, 1.08, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.8 }}
              >
                {badgeIds.slice(0, 3).map(id => (
                  <Badge key={id} badgeId={id} size="lg" showTooltip={false} />
                ))}
              </motion.div>

              <h2 className="text-2xl font-extrabold text-text-primary mb-2">{title}</h2>
              <p className="text-text-secondary mb-1">
                Amazing work, {kidName}!
              </p>
              {first?.description && badgeIds.length === 1 && (
                <p className="text-sm text-text-muted">{first.description}</p>
              )}

              <button
                onClick={onClose}
                className="mt-6 btn btn-primary w-full"
              >
                Awesome!
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
