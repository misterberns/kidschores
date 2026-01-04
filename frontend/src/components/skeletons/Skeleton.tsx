import { motion } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

const roundedClasses = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
};

/**
 * Base skeleton component with shimmer animation
 * Provides a loading placeholder with animated gradient
 */
export function Skeleton({
  className = '',
  width,
  height,
  rounded = 'md',
}: SkeletonProps) {
  const prefersReducedMotion = useReducedMotion();

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  if (prefersReducedMotion) {
    return (
      <div
        className={`bg-bg-accent animate-pulse ${roundedClasses[rounded]} ${className}`}
        style={style}
      />
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-bg-accent ${roundedClasses[rounded]} ${className}`}
      style={style}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
}

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

/**
 * Skeleton text placeholder with multiple lines
 */
export function SkeletonText({ lines = 3, className = '' }: SkeletonTextProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={16}
          rounded="md"
          className={i === lines - 1 ? 'w-3/4' : 'w-full'}
        />
      ))}
    </div>
  );
}

interface SkeletonCircleProps {
  size?: number;
  className?: string;
}

/**
 * Circular skeleton for avatars and icons
 */
export function SkeletonCircle({ size = 40, className = '' }: SkeletonCircleProps) {
  return <Skeleton width={size} height={size} rounded="full" className={className} />;
}

interface SkeletonButtonProps {
  width?: string | number;
  className?: string;
}

/**
 * Skeleton button placeholder
 */
export function SkeletonButton({ width = 100, className = '' }: SkeletonButtonProps) {
  return <Skeleton width={width} height={40} rounded="lg" className={className} />;
}

export default Skeleton;
