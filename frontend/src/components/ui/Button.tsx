import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * Shared button primitive — replaces the ~6 divergent inline button styles
 * (UX-REVIEW-2026-07 §4.1). All variants consume the fixed design tokens so
 * typography, shadows, focus rings and press states stay consistent.
 *
 * Variants:
 *  - primary   solid Feather-Green (default CTA)
 *  - secondary surface + green border (secondary CTA)
 *  - accent    orange gradient (kid-facing "Get This!"-class CTAs)
 *  - success   solid approved-green (approve actions)
 *  - danger    soft red → solid on hover (deny/destructive)
 *  - outline   transparent + border (tertiary)
 *  - ghost     borderless, hover surface (toolbar-ish)
 */
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'success'
  | 'danger'
  | 'outline'
  | 'ghost';

export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-500 text-text-inverse border border-primary-500 hover:bg-primary-600 hover:border-primary-600 shadow-sm',
  secondary:
    'bg-bg-surface text-primary-500 border border-primary-500 hover:bg-primary-50 shadow-sm',
  accent:
    'bg-gradient-to-r from-accent-500 to-accent-400 text-white border border-transparent hover:from-accent-600 hover:to-accent-500 shadow-md',
  success:
    'bg-status-approved-border text-white border border-transparent hover:opacity-90 shadow-sm',
  danger:
    'bg-status-overdue-bg text-status-overdue-text border border-transparent hover:bg-status-overdue-border hover:text-white',
  outline:
    'bg-transparent text-text-primary border border-[var(--border-color)] hover:bg-bg-accent',
  ghost:
    'bg-transparent text-text-secondary border border-transparent hover:bg-bg-elevated hover:text-text-primary',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5 rounded-lg',
  md: 'px-4 py-2.5 text-sm gap-2 rounded-xl',
  lg: 'px-5 py-3 text-base gap-2 rounded-xl touch-target',
};

export interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = 'primary', size = 'md', fullWidth, loading, className = '', children, disabled, ...props },
    ref
  ) {
    const prefersReducedMotion = useReducedMotion();
    return (
      <motion.button
        ref={ref}
        className={[
          'inline-flex items-center justify-center font-bold transition-colors',
          'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-500/40',
          'disabled:opacity-50 disabled:pointer-events-none',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          fullWidth ? 'w-full' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        disabled={disabled || loading}
        whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
        whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
        {...props}
      >
        {loading && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
        {children}
      </motion.button>
    );
  }
);

/**
 * Icon-only button. `label` is REQUIRED and becomes aria-label + title —
 * an icon-only button without an accessible name cannot be constructed
 * (closes audit item U8 by design).
 */
export interface IconButtonProps extends HTMLMotionProps<'button'> {
  label: string;
  size?: ButtonSize;
  variant?: Extract<ButtonVariant, 'ghost' | 'outline' | 'danger'>;
  children?: React.ReactNode;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ label, size = 'md', variant = 'ghost', className = '', children, ...props }, ref) {
    const prefersReducedMotion = useReducedMotion();
    const pad = size === 'sm' ? 'p-1.5' : size === 'lg' ? 'p-3' : 'p-2';
    return (
      <motion.button
        ref={ref}
        aria-label={label}
        title={label}
        className={[
          'inline-flex items-center justify-center rounded-lg transition-colors',
          'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-500/40',
          'disabled:opacity-50 disabled:pointer-events-none',
          VARIANT_CLASSES[variant],
          pad,
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
        whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
