import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Hand, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';

type ChoreStatus = 'pending' | 'claimed' | 'approved' | 'overdue' | 'expired';

interface AnimatedBadgeProps {
  status: ChoreStatus;
  className?: string;
}

const statusConfig = {
  pending: {
    icon: Clock,
    label: 'Pending',
    bgClass: 'badge-pending',
  },
  claimed: {
    icon: Hand,
    label: 'Claimed',
    bgClass: 'badge-claimed',
  },
  approved: {
    icon: CheckCircle,
    label: 'Approved',
    bgClass: 'badge-approved',
  },
  overdue: {
    icon: AlertTriangle,
    label: 'Overdue',
    bgClass: 'badge-overdue',
  },
  expired: {
    icon: XCircle,
    label: 'Expired',
    bgClass: 'badge-overdue', // Reuse overdue styling for expired
  },
};

/**
 * Animated status badge with smooth transitions between states
 * Uses AnimatePresence for enter/exit animations
 */
export function AnimatedBadge({ status, className = '' }: AnimatedBadgeProps) {
  const prefersReducedMotion = useReducedMotion();
  const config = statusConfig[status];
  const Icon = config.icon;

  if (prefersReducedMotion) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${config.bgClass} ${className}`}
      >
        <Icon size={12} />
        {config.label}
      </span>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={status}
        initial={{ opacity: 0, scale: 0.8, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 10 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${config.bgClass} ${className}`}
      >
        <motion.span
          initial={{ rotate: -180, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
        >
          <Icon size={12} />
        </motion.span>
        {config.label}
      </motion.span>
    </AnimatePresence>
  );
}

interface CountBadgeProps {
  count: number;
  className?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
}

// Theme-aware variant colors (use CSS variables)
const variantClasses = {
  primary: 'bg-primary-500 text-white',
  secondary: 'bg-bg-accent text-text-primary',
  success: 'bg-primary-500 text-white',
  warning: 'bg-accent-500 text-white',
  danger: 'bg-status-error text-white',
};

/**
 * Animated count badge with pop effect on change
 */
export function CountBadge({ count, className = '', variant = 'primary' }: CountBadgeProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.span
      key={count}
      initial={prefersReducedMotion ? false : { scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      className={`inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full text-xs font-bold ${variantClasses[variant]} ${className}`}
    >
      {count}
    </motion.span>
  );
}

interface PulseBadgeProps {
  children: React.ReactNode;
  pulse?: boolean;
  className?: string;
}

/**
 * Badge with optional pulse animation for attention
 */
export function PulseBadge({ children, pulse = false, className = '' }: PulseBadgeProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.span
      animate={
        pulse && !prefersReducedMotion
          ? {
              scale: [1, 1.1, 1],
              boxShadow: [
                '0 0 0 0 rgba(var(--primary-500-rgb), 0)',
                '0 0 0 8px rgba(var(--primary-500-rgb), 0.3)',
                '0 0 0 0 rgba(var(--primary-500-rgb), 0)',
              ],
            }
          : {}
      }
      transition={{ duration: 1.5, repeat: Infinity }}
      className={`inline-flex items-center ${className}`}
    >
      {children}
    </motion.span>
  );
}

export default AnimatedBadge;
