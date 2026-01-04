import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';
import { Star } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface AnimatedPointsProps {
  value: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showIcon?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
  xl: 'text-5xl',
};

const iconSizes = {
  sm: 14,
  md: 18,
  lg: 24,
  xl: 28,
};

/**
 * Animated points counter with spring physics
 * Smoothly animates between values when points change
 */
export function AnimatedPoints({
  value,
  size = 'md',
  showIcon = true,
  className = '',
}: AnimatedPointsProps) {
  const prefersReducedMotion = useReducedMotion();

  // Spring animation for the number
  const springValue = useSpring(0, {
    stiffness: 100,
    damping: 20,
    restDelta: 0.01,
  });

  // Transform to integer for display
  const displayValue = useTransform(springValue, (v) => Math.floor(v));

  // Update spring when value changes
  useEffect(() => {
    if (prefersReducedMotion) {
      springValue.jump(value);
    } else {
      springValue.set(value);
    }
  }, [value, springValue, prefersReducedMotion]);

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {showIcon && (
        <Star
          size={iconSizes[size]}
          className="text-accent-500"
          fill="currentColor"
        />
      )}
      <motion.span
        className={`font-bold tabular-nums ${sizeClasses[size]}`}
      >
        {displayValue}
      </motion.span>
    </div>
  );
}

interface PointsChangeProps {
  points: number;
  show: boolean;
  onComplete?: () => void;
  isPositive?: boolean;
}

/**
 * Flying points indicator that appears when points change
 * Shows +X or -X and flies up before fading
 */
export function PointsChange({
  points,
  show,
  onComplete,
  isPositive = true,
}: PointsChangeProps) {
  const prefersReducedMotion = useReducedMotion();

  if (!show) return null;

  if (prefersReducedMotion) {
    // Simple fade for reduced motion
    return (
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        onAnimationComplete={onComplete}
        className={`flex items-center gap-1 font-bold text-xl ${
          isPositive ? 'text-primary-500' : 'text-status-error'
        }`}
      >
        <Star size={18} className="text-accent-500" fill="currentColor" />
        {isPositive ? '+' : '-'}{Math.abs(points)}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 0.5 }}
      animate={{
        opacity: [1, 1, 0],
        y: -60,
        scale: [0.5, 1.2, 1],
      }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
      onAnimationComplete={onComplete}
      className={`flex items-center gap-1 font-bold text-xl pointer-events-none ${
        isPositive ? 'text-primary-500' : 'text-status-error'
      }`}
    >
      <Star size={18} className="text-accent-500" fill="currentColor" />
      {isPositive ? '+' : '-'}{Math.abs(points)}
    </motion.div>
  );
}

/**
 * Points display with background pill styling
 * Uses Duolingo warm orange color scheme
 */
export function PointsBadge({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' | 'lg' }) {
  const paddingClasses = {
    sm: 'px-2 py-0.5',
    md: 'px-3 py-1',
    lg: 'px-4 py-1.5',
  };

  return (
    <div
      className={`inline-flex items-center gap-1 bg-accent-500/10 rounded-full ${paddingClasses[size]}`}
    >
      <AnimatedPoints value={value} size={size} showIcon={true} />
    </div>
  );
}

export default AnimatedPoints;
