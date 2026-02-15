// Reusable animation variants for Framer Motion
// KidsChores App - Fluid UI Design System

import type { Variants, Transition } from 'framer-motion';

// ============================================
// Transition Presets
// ============================================

export const springTransition: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 30,
};

export const smoothTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 25,
};

export const gentleTransition: Transition = {
  type: 'spring',
  stiffness: 200,
  damping: 20,
};

// ============================================
// Fade Variants
// ============================================

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: smoothTransition,
  },
  exit: { opacity: 0, y: -10 },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: smoothTransition,
  },
  exit: { opacity: 0, y: 20 },
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: smoothTransition,
  },
  exit: { opacity: 0, x: 30 },
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: smoothTransition,
  },
  exit: { opacity: 0, x: -30 },
};

// ============================================
// Scale Variants
// ============================================

export const popIn: Variants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: springTransition,
  },
  exit: { scale: 0.8, opacity: 0 },
};

export const scaleIn: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
  exit: { scale: 0, opacity: 0 },
};

export const bounceIn: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: [0, 1.1, 0.95, 1],
    opacity: 1,
    transition: {
      duration: 0.5,
      times: [0, 0.5, 0.75, 1],
    },
  },
};

// ============================================
// Container Variants (for staggered children)
// ============================================

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

export const staggerContainerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

export const staggerContainerSlow: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

// ============================================
// Card Variants
// ============================================

export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: smoothTransition,
  },
  exit: { opacity: 0, y: -20, scale: 0.95 },
  hover: {
    scale: 1.02,
    boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
    transition: { type: 'spring', stiffness: 400 },
  },
  tap: { scale: 0.98 },
};

export const listItemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: smoothTransition,
  },
  exit: { opacity: 0, x: 20 },
};

// ============================================
// Button Variants
// ============================================

export const buttonVariants: Variants = {
  idle: { scale: 1 },
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
  disabled: { opacity: 0.5, scale: 1 },
};

export const buttonSuccessVariants: Variants = {
  idle: { scale: 1, backgroundColor: 'var(--primary-500)' },
  success: {
    scale: [1, 1.2, 1],
    backgroundColor: ['var(--primary-500)', '#40a02b', 'var(--primary-500)'],
    transition: { duration: 0.5 },
  },
};

// ============================================
// Page Transition Variants
// ============================================

export const pageVariants: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
};

export const pageSlideUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};

// ============================================
// Modal Variants
// ============================================

export const modalOverlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalContentVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springTransition,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: { duration: 0.15 },
  },
};

// ============================================
// Celebration Variants
// ============================================

export const celebrateVariants: Variants = {
  idle: { scale: 1, rotate: 0 },
  celebrate: {
    scale: [1, 1.2, 1],
    rotate: [0, -5, 5, -5, 0],
    transition: { duration: 0.5 },
  },
};

export const flyUpVariants: Variants = {
  hidden: { opacity: 0, y: 0, scale: 0.5 },
  visible: {
    opacity: [1, 1, 0],
    y: -100,
    scale: [0.5, 1.5, 1],
    transition: { duration: 1.5, ease: 'easeOut' },
  },
};

// ============================================
// Badge Variants
// ============================================

export const badgeVariants: Variants = {
  hidden: { scale: 0, rotate: -180 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 15,
    },
  },
  hover: { scale: 1.2, rotate: 10 },
};

// ============================================
// Progress Variants
// ============================================

export const progressVariants: Variants = {
  hidden: { scaleX: 0, originX: 0 },
  visible: (progress: number) => ({
    scaleX: progress,
    transition: { duration: 0.8, ease: 'easeOut' },
  }),
};

// ============================================
// Skeleton Shimmer
// ============================================

export const shimmerVariants: Variants = {
  hidden: { x: '-100%' },
  visible: {
    x: '100%',
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: 'linear',
    },
  },
};

// ============================================
// Utility Functions
// ============================================

/**
 * Creates a stagger delay for list items
 */
export function getStaggerDelay(index: number, baseDelay = 0.1): number {
  return index * baseDelay;
}

/**
 * Creates a custom card variant with index-based delay
 */
export function getCardVariant(index: number): Variants {
  return {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: index * 0.1,
        ...smoothTransition,
      },
    },
    hover: {
      scale: 1.02,
      boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
      transition: { type: 'spring', stiffness: 400 },
    },
    tap: { scale: 0.98 },
  };
}
