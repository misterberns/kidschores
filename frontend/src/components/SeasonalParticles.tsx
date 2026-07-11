import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../theme';
import { useReducedMotion } from '../hooks/useReducedMotion';
import type { SeasonalTheme } from '../theme/seasonal';

interface ParticleConfig {
  emojis: string[];
  count: number;
  drift: 'fall' | 'rise' | 'float';
  speed: number; // seconds per cycle
  /** Anchor particles to the viewport edges instead of drifting over content
      (UX-REVIEW-2026-07 §4.3 — everyday decoration should be ambient, not noise). */
  edgeAnchored?: boolean;
}

const seasonalParticles: Record<SeasonalTheme, ParticleConfig> = {
  default: {
    emojis: ['✨', '⭐'],
    count: 5,
    drift: 'float',
    speed: 14,
    edgeAnchored: true,
  },
  halloween: {
    emojis: ['🎃', '👻', '🦇', '🕸️', '🕷️', '🍬'],
    count: 20,
    drift: 'float',
    speed: 10,
  },
  christmas: {
    emojis: ['❄️', '✨', '⭐', '🎄', '🎁', '🔔'],
    count: 25,
    drift: 'fall',
    speed: 8,
  },
  easter: {
    emojis: ['🌸', '🥚', '🐣', '🌷', '🦋', '🐰'],
    count: 18,
    drift: 'rise',
    speed: 10,
  },
  summer: {
    emojis: ['☀️', '🌊', '🐚', '🌴', '🍉', '🏖️'],
    count: 16,
    drift: 'float',
    speed: 12,
  },
};

interface Particle {
  id: number;
  emoji: string;
  x: number;       // % from left
  startY: number;  // % from top
  size: number;     // rem
  delay: number;    // seconds
  opacity: number;
}

function generateParticles(config: ParticleConfig): Particle[] {
  return Array.from({ length: config.count }, (_, i) => {
    // Edge-anchored: keep particles in the outer ~10% bands, clear of content
    const x = config.edgeAnchored
      ? (i % 2 === 0 ? Math.random() * 8 + 1 : Math.random() * 8 + 90)
      : Math.random() * 95 + 2.5;
    return {
      id: i,
      emoji: config.emojis[i % config.emojis.length],
      x,
      startY: Math.random() * 90 + 5,
      size: config.edgeAnchored ? 0.8 + Math.random() * 0.8 : 0.9 + Math.random() * 1.3,
      delay: Math.random() * config.speed,
      opacity: config.edgeAnchored ? 0.12 + Math.random() * 0.18 : 0.25 + Math.random() * 0.3,
    };
  });
}

function getAnimation(drift: ParticleConfig['drift'], speed: number) {
  switch (drift) {
    case 'fall':
      return {
        y: ['-10vh', '110vh'],
        x: [0, (Math.random() - 0.5) * 60],
        rotate: [0, 360],
        transition: { duration: speed, repeat: Infinity, ease: 'linear' as const },
      };
    case 'rise':
      return {
        y: ['110vh', '-10vh'],
        x: [0, (Math.random() - 0.5) * 40],
        rotate: [0, -180],
        transition: { duration: speed, repeat: Infinity, ease: 'linear' as const },
      };
    case 'float':
    default:
      return {
        y: [0, -20, 0, 15, 0],
        x: [0, 15, -10, 8, 0],
        rotate: [0, 5, -5, 3, 0],
        transition: { duration: speed, repeat: Infinity, ease: 'easeInOut' as const },
      };
  }
}

/**
 * Floating seasonal particles overlay.
 * Renders emoji particles that drift based on the current seasonal theme.
 * Respects prefers-reduced-motion.
 */
export function SeasonalParticles() {
  const { seasonal } = useTheme();
  const prefersReducedMotion = useReducedMotion();

  const config = seasonalParticles[seasonal] || seasonalParticles.default;
  const particles = useMemo(() => generateParticles(config), [seasonal]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reduced motion: render a few static scattered emojis
  if (prefersReducedMotion) {
    return (
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        {particles.slice(0, 3).map((p) => (
          <span
            key={p.id}
            className="absolute select-none"
            style={{
              left: `${p.x}%`,
              top: `${p.startY}%`,
              fontSize: `${p.size}rem`,
              opacity: p.opacity,
            }}
          >
            {p.emoji}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {particles.map((p) => {
        const anim = getAnimation(config.drift, config.speed + (Math.random() * 4 - 2));
        return (
          <motion.span
            key={p.id}
            className="absolute select-none"
            style={{
              left: `${p.x}%`,
              top: config.drift === 'fall' ? undefined : `${p.startY}%`,
              fontSize: `${p.size}rem`,
              opacity: p.opacity,
            }}
            animate={anim}
            transition={{
              ...anim.transition,
              delay: p.delay,
            }}
          >
            {p.emoji}
          </motion.span>
        );
      })}
    </div>
  );
}
