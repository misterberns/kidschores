import { useState, useEffect } from 'react';

/**
 * Hook to detect if user prefers reduced motion
 * Respects the prefers-reduced-motion media query for accessibility
 *
 * @returns boolean - true if user prefers reduced motion
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    // Check initial value (SSR-safe)
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Handler for media query changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Add listener
    mediaQuery.addEventListener('change', handleChange);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

/**
 * Returns animation props based on reduced motion preference
 * Use this to conditionally disable animations
 */
export function useMotionSafe() {
  const prefersReducedMotion = useReducedMotion();

  return {
    prefersReducedMotion,
    // Returns animation props or empty object based on preference
    safeAnimate: <T extends object>(animateProps: T): T | Record<string, never> =>
      prefersReducedMotion ? {} : animateProps,
    // Returns transition or instant transition
    safeTransition: (transition: object) =>
      prefersReducedMotion ? { duration: 0 } : transition,
    // Returns initial state or false (no initial animation)
    safeInitial: <T>(initial: T): T | false =>
      prefersReducedMotion ? false : initial,
  };
}

/**
 * Helper to get animation variant based on reduced motion
 * Returns simplified/instant variants when motion is reduced
 */
export function getReducedMotionVariant<T extends object>(
  fullVariant: T,
  reducedVariant: Partial<T> | false,
  prefersReducedMotion: boolean
): T | Partial<T> | false {
  return prefersReducedMotion ? reducedVariant : fullVariant;
}

export default useReducedMotion;
