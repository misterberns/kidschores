import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { pageVariants } from '../utils/animations';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper component for smooth page transitions
 * Respects prefers-reduced-motion accessibility setting
 */
export function PageTransition({ children, className = '' }: PageTransitionProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    // Skip animation for users who prefer reduced motion
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}

/**
 * Slide-up page transition variant
 */
export function PageSlideUp({ children, className = '' }: PageTransitionProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Fade-only page transition (subtler)
 */
export function PageFade({ children, className = '' }: PageTransitionProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

export default PageTransition;
