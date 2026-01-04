import { motion, AnimatePresence } from 'framer-motion';
import { Star, Sparkles } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface PointsEarnedProps {
  points: number;
  show: boolean;
  onComplete?: () => void;
  position?: 'center' | 'top' | 'bottom';
}

/**
 * Flying points earned animation
 * Shows "+X" with star icon floating up and fading
 */
export function PointsEarned({
  points,
  show,
  onComplete,
  position = 'center',
}: PointsEarnedProps) {
  const prefersReducedMotion = useReducedMotion();

  const positionClasses = {
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    top: 'top-20 left-1/2 -translate-x-1/2',
    bottom: 'bottom-32 left-1/2 -translate-x-1/2',
  };

  if (prefersReducedMotion) {
    return (
      <AnimatePresence>
        {show && (
          <motion.div
            className={`fixed ${positionClasses[position]} z-50`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onAnimationComplete={() => {
              if (onComplete) setTimeout(onComplete, 500);
            }}
          >
            <div className="flex items-center gap-2 bg-accent-500 text-white px-6 py-3 rounded-full font-bold text-2xl shadow-lg">
              <Star size={28} fill="currentColor" />
              +{points}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={`fixed ${positionClasses[position]} z-50 pointer-events-none`}
          initial={{ opacity: 0, scale: 0.5, y: 50 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0.5, 1.2, 1, 0.8],
            y: [50, 0, -30, -100],
          }}
          transition={{
            duration: 1.5,
            times: [0, 0.2, 0.6, 1],
            ease: 'easeOut',
          }}
          onAnimationComplete={onComplete}
        >
          {/* Sparkle particles */}
          <div className="relative">
            {[...Array(6)].map((_, i) => {
              const angle = (i / 6) * Math.PI * 2;
              const distance = 40 + Math.random() * 20;
              return (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{
                    left: '50%',
                    top: '50%',
                  }}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                  animate={{
                    x: Math.cos(angle) * distance,
                    y: Math.sin(angle) * distance,
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                  }}
                  transition={{
                    duration: 0.8,
                    delay: 0.2 + i * 0.05,
                    ease: 'easeOut',
                  }}
                >
                  <Sparkles size={16} className="text-accent-400" />
                </motion.div>
              );
            })}

            {/* Main points display - theme-aware gradient */}
            <motion.div
              className="flex items-center gap-2 bg-gradient-to-r from-accent-400 to-accent-500 text-white px-8 py-4 rounded-full font-bold text-3xl shadow-xl"
              animate={{
                boxShadow: [
                  '0 0 0 0 rgba(255, 150, 0, 0)',
                  '0 0 30px 10px rgba(255, 150, 0, 0.4)',
                  '0 0 0 0 rgba(255, 150, 0, 0)',
                ],
              }}
              transition={{ duration: 1, repeat: 1 }}
            >
              <motion.span
                animate={{ rotate: [0, -20, 20, 0] }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Star size={32} fill="currentColor" />
              </motion.span>
              +{points}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface FloatingPointsProps {
  points: number;
  show: boolean;
  onComplete?: () => void;
  x: number;
  y: number;
}

/**
 * Small floating points indicator at a specific position
 * Good for inline rewards (e.g., after claiming a chore)
 */
export function FloatingPoints({ points, show, onComplete, x, y }: FloatingPointsProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed z-50 pointer-events-none"
          style={{ left: x, top: y }}
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 0, scale: 0.5 }}
          animate={
            prefersReducedMotion
              ? { opacity: [0, 1, 0] }
              : {
                  opacity: [0, 1, 1, 0],
                  y: -60,
                  scale: [0.5, 1.2, 1],
                }
          }
          transition={{ duration: prefersReducedMotion ? 0.5 : 1.2, ease: 'easeOut' }}
          onAnimationComplete={onComplete}
        >
          <div className="flex items-center gap-1 font-bold text-xl text-primary-500">
            <Star size={18} className="text-accent-500" fill="currentColor" />
            +{points}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PointsEarned;
