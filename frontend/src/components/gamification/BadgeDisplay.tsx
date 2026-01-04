import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  Award,
  Flame,
  Star,
  Zap,
  Trophy,
  Crown,
  Clock,
  CheckCircle2,
  Target,
  Sparkles,
  Medal,
  Rocket,
} from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  gradient: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// Duolingo-style badge definitions with vibrant colors
const badgeDefinitions: Record<string, BadgeDefinition> = {
  first_chore: {
    id: 'first_chore',
    name: 'First Steps',
    description: 'Completed your first chore!',
    icon: Star,
    color: '#58CC02',  // Feather Green
    gradient: 'from-[#7AE82A] to-[#58CC02]',
    rarity: 'common',
  },
  streak_3: {
    id: 'streak_3',
    name: 'On Fire',
    description: '3-day chore streak',
    icon: Flame,
    color: '#FF9600',  // Warm Orange
    gradient: 'from-[#FFBE00] to-[#FF9600]',
    rarity: 'common',
  },
  streak_7: {
    id: 'streak_7',
    name: 'Week Warrior',
    description: '7-day chore streak',
    icon: Zap,
    color: '#FFBE00',  // Golden Yellow
    gradient: 'from-[#FFD93D] to-[#FFBE00]',
    rarity: 'rare',
  },
  streak_30: {
    id: 'streak_30',
    name: 'Monthly Master',
    description: '30-day chore streak',
    icon: Crown,
    color: '#CE82FF',  // Grape Purple
    gradient: 'from-[#D8A8FF] to-[#CE82FF]',
    rarity: 'legendary',
  },
  early_bird: {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Completed a chore before 8 AM',
    icon: Clock,
    color: '#1CB0F6',  // Sky Blue
    gradient: 'from-[#49C0F8] to-[#1CB0F6]',
    rarity: 'rare',
  },
  perfectionist: {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Completed all chores for a week',
    icon: CheckCircle2,
    color: '#58CC02',  // Feather Green
    gradient: 'from-[#89E219] to-[#58CC02]',
    rarity: 'epic',
  },
  team_player: {
    id: 'team_player',
    name: 'Team Player',
    description: 'Helped with 10 shared chores',
    icon: Award,
    color: '#1CB0F6',  // Sky Blue
    gradient: 'from-[#00D4FF] to-[#1CB0F6]',
    rarity: 'rare',
  },
  goal_crusher: {
    id: 'goal_crusher',
    name: 'Goal Crusher',
    description: 'Reached 1000 total points',
    icon: Target,
    color: '#FF4B4B',  // Berry Red
    gradient: 'from-[#FF7676] to-[#FF4B4B]',
    rarity: 'epic',
  },
  superstar: {
    id: 'superstar',
    name: 'Superstar',
    description: 'Earned 50 points in one day',
    icon: Sparkles,
    color: '#FF9600',  // Warm Orange
    gradient: 'from-[#FFAB33] to-[#FF9600]',
    rarity: 'rare',
  },
  champion: {
    id: 'champion',
    name: 'Champion',
    description: 'Redeemed your first reward',
    icon: Medal,
    color: '#CE82FF',  // Grape Purple
    gradient: 'from-[#A855F7] to-[#CE82FF]',
    rarity: 'common',
  },
  rocket_start: {
    id: 'rocket_start',
    name: 'Rocket Start',
    description: 'Completed 5 chores on your first day',
    icon: Rocket,
    color: '#FF4B4B',  // Berry Red
    gradient: 'from-[#FF8E8E] to-[#FF4B4B]',
    rarity: 'epic',
  },
  legend: {
    id: 'legend',
    name: 'Legend',
    description: 'Reached Level 5',
    icon: Trophy,
    color: '#FF9600',  // Warm Orange
    gradient: 'from-[#FFBE00] to-[#FF9600]',
    rarity: 'legendary',
  },
};

// Duolingo-style rarity glow effects
const rarityGlow = {
  common: '',
  rare: 'ring-2 ring-[#1CB0F6]/50',      // Sky Blue
  epic: 'ring-2 ring-[#CE82FF]/50',       // Grape Purple
  legendary: 'ring-2 ring-[#FF9600]/50 animate-pulse',  // Warm Orange
};

interface SingleBadgeProps {
  badgeId: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  locked?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { container: 32, icon: 16 },
  md: { container: 44, icon: 22 },
  lg: { container: 56, icon: 28 },
};

/**
 * Single badge with tooltip showing name and description
 */
export function Badge({
  badgeId,
  size = 'md',
  showTooltip = true,
  locked = false,
  className = '',
}: SingleBadgeProps) {
  const [showInfo, setShowInfo] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const badge = badgeDefinitions[badgeId];
  const config = sizeConfig[size];

  if (!badge) return null;

  const Icon = badge.icon;

  return (
    <div className={`relative inline-block ${className}`}>
      <motion.div
        className={`rounded-full flex items-center justify-center cursor-pointer transition-opacity
          ${locked ? 'bg-bg-accent opacity-40' : `bg-gradient-to-br ${badge.gradient}`}
          ${!locked && rarityGlow[badge.rarity]}`}
        style={{ width: config.container, height: config.container }}
        whileHover={prefersReducedMotion ? {} : { scale: 1.15, rotate: 10 }}
        whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
        onMouseEnter={() => showTooltip && setShowInfo(true)}
        onMouseLeave={() => setShowInfo(false)}
        onClick={() => showTooltip && setShowInfo(!showInfo)}
      >
        <Icon
          size={config.icon}
          className={locked ? 'text-text-muted' : 'text-white'}
        />
      </motion.div>

      {/* Tooltip */}
      <AnimatePresence>
        {showInfo && showTooltip && (
          <motion.div
            className="absolute z-50 bottom-full left-1/2 mb-2 -translate-x-1/2"
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            <div className="bg-bg-elevated rounded-lg shadow-xl p-3 min-w-[160px] text-center border border-bg-accent">
              <p className="font-bold text-text-primary text-sm">{badge.name}</p>
              <p className="text-xs text-text-muted mt-1">{badge.description}</p>
              <span
                className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full capitalize
                  ${badge.rarity === 'legendary' ? 'bg-[#FF9600]/20 text-[#E68600]' : ''}
                  ${badge.rarity === 'epic' ? 'bg-[#CE82FF]/20 text-[#A855F7]' : ''}
                  ${badge.rarity === 'rare' ? 'bg-[#1CB0F6]/20 text-[#0E9FE3]' : ''}
                  ${badge.rarity === 'common' ? 'bg-[#58CC02]/20 text-[#4CAD02]' : ''}`}
              >
                {badge.rarity}
              </span>
              {/* Arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-bg-elevated" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface BadgeDisplayProps {
  badges: string[];
  maxDisplay?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Display a collection of earned badges with overflow indicator
 */
export function BadgeDisplay({
  badges,
  maxDisplay = 5,
  size = 'md',
  className = '',
}: BadgeDisplayProps) {
  const prefersReducedMotion = useReducedMotion();
  const displayedBadges = badges.slice(0, maxDisplay);
  const overflowCount = badges.length - maxDisplay;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {displayedBadges.map((badgeId, index) => (
        <motion.div
          key={badgeId}
          initial={prefersReducedMotion ? false : { scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: index * 0.1, type: 'spring' }}
        >
          <Badge badgeId={badgeId} size={size} />
        </motion.div>
      ))}

      {overflowCount > 0 && (
        <div
          className={`rounded-full bg-bg-accent flex items-center justify-center text-xs font-bold text-text-muted`}
          style={{ width: sizeConfig[size].container, height: sizeConfig[size].container }}
        >
          +{overflowCount}
        </div>
      )}
    </div>
  );
}

interface BadgeGridProps {
  earnedBadges: string[];
  showLocked?: boolean;
  className?: string;
}

/**
 * Grid display of all badges with earned/locked state
 */
export function BadgeGrid({
  earnedBadges,
  showLocked = true,
  className = '',
}: BadgeGridProps) {
  const allBadgeIds = Object.keys(badgeDefinitions);
  const badgesToShow = showLocked
    ? allBadgeIds
    : allBadgeIds.filter((id) => earnedBadges.includes(id));

  return (
    <div className={`grid grid-cols-4 gap-3 ${className}`}>
      {badgesToShow.map((badgeId) => (
        <Badge
          key={badgeId}
          badgeId={badgeId}
          locked={!earnedBadges.includes(badgeId)}
          size="lg"
        />
      ))}
    </div>
  );
}

/**
 * Get badge definition by ID
 */
export function getBadgeInfo(badgeId: string): BadgeDefinition | undefined {
  return badgeDefinitions[badgeId];
}

/**
 * Get all badge definitions
 */
export function getAllBadges(): BadgeDefinition[] {
  return Object.values(badgeDefinitions);
}

export default BadgeDisplay;
