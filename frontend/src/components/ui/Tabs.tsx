import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * Shared tab primitives — replace the per-page inline pill/toggle tabs
 * (kid selectors on Chores/Rewards/Allowance/History, view toggles, Admin
 * tab bar). Preserve the role="tablist"/role="tab"/aria-selected semantics
 * the e2e suite selects on.
 *
 * Shapes:
 *  - pill  rounded-full (kid selectors)
 *  - soft  rounded-lg   (compact view toggles)
 *  - card  rounded-xl   (Admin section tabs)
 */
export type TabShape = 'pill' | 'soft' | 'card';
export type TabTone = 'primary' | 'accent';

export function TabList({
  label,
  className = '',
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={['flex items-center gap-2 overflow-x-auto pb-2', className].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}

const SHAPE_CLASSES: Record<TabShape, string> = {
  pill: 'px-4 py-2 rounded-full text-sm font-medium',
  soft: 'px-3 py-1.5 rounded-lg text-sm font-medium',
  card: 'px-4 py-2.5 rounded-xl font-medium',
};

const SELECTED_CLASSES: Record<TabTone, string> = {
  primary: 'bg-primary-500 border-primary-500 text-text-inverse shadow-sm',
  accent: 'bg-accent-500 border-accent-500 text-text-inverse shadow-sm',
};

export interface TabProps extends HTMLMotionProps<'button'> {
  selected: boolean;
  shape?: TabShape;
  tone?: TabTone;
  children?: React.ReactNode;
}

export const Tab = React.forwardRef<HTMLButtonElement, TabProps>(function Tab(
  { selected, shape = 'pill', tone = 'primary', className = '', children, ...props },
  ref
) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.button
      ref={ref}
      role="tab"
      aria-selected={selected}
      className={[
        'flex-shrink-0 flex items-center gap-1.5 whitespace-nowrap transition-colors border-2',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-500/40',
        SHAPE_CLASSES[shape],
        selected
          ? SELECTED_CLASSES[tone]
          : 'border-[var(--border-color)] bg-transparent text-text-primary hover:bg-bg-elevated',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
      whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
      {...props}
    >
      {children}
    </motion.button>
  );
});
