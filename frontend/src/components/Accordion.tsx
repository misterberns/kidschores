import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface AccordionItemProps {
  question: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

/**
 * Single accordion item with expandable content
 */
export function AccordionItem({ question, children, defaultOpen = false }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="border-b border-border-primary last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 px-2 text-left hover:bg-bg-accent/50 transition-colors rounded-lg touch-target"
        aria-expanded={isOpen}
      >
        <span className="font-medium text-text-primary pr-4">{question}</span>
        <motion.span
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 25 }}
          className="flex-shrink-0 text-text-secondary"
        >
          <ChevronRight size={20} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pb-4 px-2 text-text-secondary text-sm leading-relaxed">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface AccordionSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Section wrapper for grouping accordion items
 */
export function AccordionSection({ title, icon, children }: AccordionSectionProps) {
  return (
    <div className="card p-4 mb-4">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-text-primary mb-2 pb-2 border-b border-border-primary">
        {icon}
        {title}
      </h3>
      <div className="divide-y divide-border-primary">
        {children}
      </div>
    </div>
  );
}

export default AccordionItem;
