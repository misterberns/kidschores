import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { Chorbie } from './Chorbie';
import type { ChorbieProps } from './Chorbie';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export type ChorbieAnimation =
  | 'idle'
  | 'bounce'
  | 'wave'
  | 'dance'
  | 'pulse'
  | 'float'
  | 'spin'
  | 'entrance';

export interface ChorbieAnimatedProps extends ChorbieProps {
  animation?: ChorbieAnimation;
  /**
   * Loop the animation continuously
   * @default true for idle/float/pulse, false for others
   */
  loop?: boolean;
  /**
   * Delay before animation starts (in seconds)
   */
  delay?: number;
  /**
   * Callback when animation completes (for non-looping animations)
   */
  onAnimationComplete?: () => void;
}

const bounceVariants: Variants = {
  initial: { y: 0, scale: 1 },
  animate: {
    y: [0, -15, 0],
    scale: [1, 1.05, 1],
    transition: {
      duration: 0.5,
      ease: 'easeInOut',
      times: [0, 0.5, 1],
    },
  },
  loop: {
    y: [0, -10, 0],
    transition: {
      duration: 0.8,
      ease: 'easeInOut',
      repeat: Infinity,
      repeatDelay: 1.5,
    },
  },
};

const waveVariants: Variants = {
  initial: { rotate: 0 },
  animate: {
    rotate: [0, 15, -10, 15, -5, 0],
    transition: {
      duration: 1,
      ease: 'easeInOut',
    },
  },
  loop: {
    rotate: [0, 10, -5, 10, 0],
    transition: {
      duration: 0.8,
      ease: 'easeInOut',
      repeat: Infinity,
      repeatDelay: 2,
    },
  },
};

const danceVariants: Variants = {
  initial: { rotate: 0, scale: 1 },
  animate: {
    rotate: [0, -10, 10, -10, 10, 0],
    scale: [1, 1.05, 1, 1.05, 1],
    y: [0, -5, 0, -5, 0],
    transition: {
      duration: 1,
      ease: 'easeInOut',
    },
  },
  loop: {
    rotate: [0, -8, 8, -8, 8, 0],
    scale: [1, 1.03, 1, 1.03, 1],
    y: [0, -5, 0, -5, 0],
    transition: {
      duration: 1.2,
      ease: 'easeInOut',
      repeat: Infinity,
      repeatDelay: 0.5,
    },
  },
};

const pulseVariants: Variants = {
  initial: { scale: 1, opacity: 1 },
  animate: {
    scale: [1, 1.08, 1],
    opacity: [1, 0.9, 1],
    transition: {
      duration: 1.5,
      ease: 'easeInOut',
      repeat: Infinity,
    },
  },
};

const floatVariants: Variants = {
  initial: { y: 0 },
  animate: {
    y: [0, -8, 0, -4, 0],
    transition: {
      duration: 3,
      ease: 'easeInOut',
      repeat: Infinity,
    },
  },
};

const spinVariants: Variants = {
  initial: { rotate: 0 },
  animate: {
    rotate: 360,
    transition: {
      duration: 0.8,
      ease: 'easeOut',
    },
  },
  loop: {
    rotate: [0, 360],
    transition: {
      duration: 3,
      ease: 'linear',
      repeat: Infinity,
    },
  },
};

const entranceVariants: Variants = {
  initial: {
    scale: 0,
    opacity: 0,
    rotate: -180,
  },
  animate: {
    scale: 1,
    opacity: 1,
    rotate: 0,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 15,
      duration: 0.6,
    },
  },
};

const idleVariants: Variants = {
  initial: { y: 0 },
  animate: {
    y: [0, -3, 0],
    transition: {
      duration: 2,
      ease: 'easeInOut',
      repeat: Infinity,
    },
  },
};

const animationMap: Record<ChorbieAnimation, Variants> = {
  idle: idleVariants,
  bounce: bounceVariants,
  wave: waveVariants,
  dance: danceVariants,
  pulse: pulseVariants,
  float: floatVariants,
  spin: spinVariants,
  entrance: entranceVariants,
};

// Default looping behavior per animation type
const defaultLooping: Record<ChorbieAnimation, boolean> = {
  idle: true,
  bounce: false,
  wave: false,
  dance: false,
  pulse: true,
  float: true,
  spin: false,
  entrance: false,
};

/**
 * Animated Chorbie mascot with Framer Motion
 *
 * @example
 * // Simple usage - bouncing happy Chorbie
 * <ChorbieAnimated expression="happy" animation="bounce" />
 *
 * @example
 * // Celebrating with dance animation
 * <ChorbieAnimated expression="celebrating" animation="dance" loop />
 *
 * @example
 * // Entrance animation with callback
 * <ChorbieAnimated
 *   expression="excited"
 *   animation="entrance"
 *   onAnimationComplete={() => console.log('Chorbie appeared!')}
 * />
 */
export function ChorbieAnimated({
  expression = 'happy',
  animation = 'idle',
  size = 100,
  className = '',
  loop,
  delay = 0,
  onAnimationComplete,
}: ChorbieAnimatedProps) {
  const prefersReducedMotion = useReducedMotion();
  const variants = animationMap[animation];

  // Determine if we should loop
  const shouldLoop = loop ?? defaultLooping[animation];

  // For reduced motion, just show static Chorbie
  if (prefersReducedMotion) {
    return <Chorbie expression={expression} size={size} className={className} />;
  }

  // Determine which animate variant to use
  const animateKey = shouldLoop && 'loop' in variants ? 'loop' : 'animate';

  return (
    <motion.div
      className={`inline-block ${className}`}
      style={{ width: typeof size === 'number' ? size : 'auto' }}
      variants={variants}
      initial="initial"
      animate={animateKey}
      transition={{ delay }}
      onAnimationComplete={onAnimationComplete}
    >
      <Chorbie expression={expression} size="100%" />
    </motion.div>
  );
}

/**
 * Pre-configured Chorbie variants for common use cases
 */
export const ChorbiePresets = {
  /**
   * Welcome Chorbie - waves to greet users
   */
  Welcome: (props: Omit<ChorbieAnimatedProps, 'expression' | 'animation'>) => (
    <ChorbieAnimated {...props} expression="happy" animation="wave" />
  ),

  /**
   * Success Chorbie - celebrates achievements
   */
  Success: (props: Omit<ChorbieAnimatedProps, 'expression' | 'animation'>) => (
    <ChorbieAnimated {...props} expression="celebrating" animation="dance" loop />
  ),

  /**
   * Encouragement Chorbie - motivates users
   */
  Encourage: (props: Omit<ChorbieAnimatedProps, 'expression' | 'animation'>) => (
    <ChorbieAnimated {...props} expression="encouraging" animation="bounce" />
  ),

  /**
   * Excited Chorbie - shows enthusiasm
   */
  Excited: (props: Omit<ChorbieAnimatedProps, 'expression' | 'animation'>) => (
    <ChorbieAnimated {...props} expression="excited" animation="pulse" />
  ),

  /**
   * Thinking Chorbie - for loading/processing states
   */
  Loading: (props: Omit<ChorbieAnimatedProps, 'expression' | 'animation'>) => (
    <ChorbieAnimated {...props} expression="thinking" animation="float" />
  ),

  /**
   * Header Chorbie - subtle idle animation for app header
   */
  Header: (props: Omit<ChorbieAnimatedProps, 'expression' | 'animation' | 'size'>) => (
    <ChorbieAnimated {...props} expression="happy" animation="idle" size={32} />
  ),

  /**
   * Empty state Chorbie - encouraging when no content
   */
  EmptyState: (props: Omit<ChorbieAnimatedProps, 'expression' | 'animation'>) => (
    <ChorbieAnimated {...props} expression="encouraging" animation="float" size={120} />
  ),
};

export default ChorbieAnimated;
