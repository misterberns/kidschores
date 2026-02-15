import { motion } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Circular SVG progress indicator with animation
 * Shows progress as a ring that fills clockwise
 */
export function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 6,
  color = 'var(--primary-500)',
  bgColor = 'var(--bg-accent)',
  children,
  className = '',
}: ProgressRingProps) {
  const prefersReducedMotion = useReducedMotion();

  // Calculate circle properties
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />

        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={prefersReducedMotion ? { strokeDashoffset: offset } : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: prefersReducedMotion ? 0 : 1, ease: 'easeOut' }}
        />
      </svg>

      {/* Center content */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}

interface ProgressRingWithLabelProps extends Omit<ProgressRingProps, 'children'> {
  label?: string;
  showPercentage?: boolean;
}

/**
 * Progress ring with built-in percentage or custom label
 */
export function ProgressRingWithLabel({
  progress,
  label,
  showPercentage = true,
  ...props
}: ProgressRingWithLabelProps) {
  return (
    <ProgressRing progress={progress} {...props}>
      <div className="text-center">
        {showPercentage && (
          <span className="text-lg font-bold text-text-primary">
            {Math.round(progress)}%
          </span>
        )}
        {label && (
          <span className="block text-xs text-text-muted">{label}</span>
        )}
      </div>
    </ProgressRing>
  );
}

interface MultiProgressRingProps {
  segments: Array<{
    progress: number;
    color: string;
    label?: string;
  }>;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

/**
 * Multi-segment progress ring for showing multiple metrics
 */
export function MultiProgressRing({
  segments,
  size = 100,
  strokeWidth = 8,
  className = '',
}: MultiProgressRingProps) {
  const prefersReducedMotion = useReducedMotion();
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  let accumulatedOffset = 0;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-accent)"
          strokeWidth={strokeWidth}
        />

        {/* Segment circles */}
        {segments.map((segment, index) => {
          const segmentLength = (segment.progress / 100) * circumference;
          const rotation = (accumulatedOffset / circumference) * 360;
          accumulatedOffset += segmentLength;

          return (
            <motion.circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
              style={{
                transform: `rotate(${rotation}deg)`,
                transformOrigin: 'center',
              }}
              initial={prefersReducedMotion ? false : { strokeDasharray: `0 ${circumference}` }}
              animate={{ strokeDasharray: `${segmentLength} ${circumference - segmentLength}` }}
              transition={{ duration: 1, delay: index * 0.2, ease: 'easeOut' }}
            />
          );
        })}
      </svg>
    </div>
  );
}

export default ProgressRing;
