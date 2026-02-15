import { motion } from 'framer-motion';
import { Star, Zap, Sparkles, Trophy, Crown } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { ProgressRing } from './ProgressRing';

interface Level {
  level: number;
  name: string;
  minPoints: number;
  maxPoints: number;
  icon: React.ElementType;
  color: string;
  gradient: string;
}

// Duolingo-style level progression colors
const levels: Level[] = [
  {
    level: 1,
    name: 'Beginner',
    minPoints: 0,
    maxPoints: 99,
    icon: Star,
    color: '#767676',
    gradient: 'from-[#9A9A9A] to-[#767676]',
  },
  {
    level: 2,
    name: 'Helper',
    minPoints: 100,
    maxPoints: 499,
    icon: Zap,
    color: '#58CC02', // Feather Green
    gradient: 'from-[#7AE82A] to-[#58CC02]',
  },
  {
    level: 3,
    name: 'Star',
    minPoints: 500,
    maxPoints: 999,
    icon: Sparkles,
    color: '#1CB0F6', // Sky Blue
    gradient: 'from-[#49C0F8] to-[#1CB0F6]',
  },
  {
    level: 4,
    name: 'Champion',
    minPoints: 1000,
    maxPoints: 2499,
    icon: Trophy,
    color: '#CE82FF', // Grape Purple
    gradient: 'from-[#D8A8FF] to-[#CE82FF]',
  },
  {
    level: 5,
    name: 'Legend',
    minPoints: 2500,
    maxPoints: Infinity,
    icon: Crown,
    color: '#FF9600', // Warm Orange
    gradient: 'from-[#FFBE00] to-[#FF9600]',
  },
];

/**
 * Get level info for a given point total
 */
export function getLevelInfo(points: number): Level & { progress: number; pointsToNext: number } {
  const currentLevel = levels.find((l) => points >= l.minPoints && points <= l.maxPoints) || levels[0];
  const nextLevel = levels.find((l) => l.level === currentLevel.level + 1);

  const pointsInLevel = points - currentLevel.minPoints;
  const levelRange = (nextLevel?.minPoints || currentLevel.maxPoints) - currentLevel.minPoints;
  const progress = Math.min((pointsInLevel / levelRange) * 100, 100);
  const pointsToNext = nextLevel ? nextLevel.minPoints - points : 0;

  return {
    ...currentLevel,
    progress,
    pointsToNext,
  };
}

interface LevelBadgeProps {
  points: number;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  showName?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { badge: 32, icon: 16, ring: 40, stroke: 3 },
  md: { badge: 48, icon: 24, ring: 60, stroke: 4 },
  lg: { badge: 64, icon: 32, ring: 80, stroke: 5 },
};

/**
 * Level badge with icon, progress ring, and optional name
 */
export function LevelBadge({
  points,
  size = 'md',
  showProgress = true,
  showName = true,
  className = '',
}: LevelBadgeProps) {
  const prefersReducedMotion = useReducedMotion();
  const levelInfo = getLevelInfo(points);
  const Icon = levelInfo.icon;
  const config = sizeConfig[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        {showProgress ? (
          <ProgressRing
            progress={levelInfo.progress}
            size={config.ring}
            strokeWidth={config.stroke}
            color={levelInfo.color}
          >
            <motion.div
              className={`w-${config.badge / 4} h-${config.badge / 4} rounded-full bg-gradient-to-br ${levelInfo.gradient} flex items-center justify-center shadow-md`}
              style={{ width: config.badge, height: config.badge }}
              whileHover={prefersReducedMotion ? {} : { scale: 1.1, rotate: 10 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <Icon size={config.icon} className="text-white" />
            </motion.div>
          </ProgressRing>
        ) : (
          <motion.div
            className={`rounded-full bg-gradient-to-br ${levelInfo.gradient} flex items-center justify-center shadow-md`}
            style={{ width: config.badge, height: config.badge }}
            whileHover={prefersReducedMotion ? {} : { scale: 1.1, rotate: 10 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <Icon size={config.icon} className="text-white" />
          </motion.div>
        )}
      </div>

      {showName && (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-text-primary">{levelInfo.name}</span>
          <span className="text-xs text-text-muted">Level {levelInfo.level}</span>
        </div>
      )}
    </div>
  );
}

interface LevelProgressBarProps {
  points: number;
  className?: string;
}

/**
 * Horizontal level progress bar with milestone markers
 */
export function LevelProgressBar({ points, className = '' }: LevelProgressBarProps) {
  const prefersReducedMotion = useReducedMotion();
  const levelInfo = getLevelInfo(points);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-text-primary">
          Level {levelInfo.level}: {levelInfo.name}
        </span>
        {levelInfo.pointsToNext > 0 && (
          <span className="text-text-muted">
            {levelInfo.pointsToNext} pts to next level
          </span>
        )}
      </div>

      <div className="relative h-3 bg-bg-accent rounded-full overflow-hidden">
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${levelInfo.gradient}`}
          initial={prefersReducedMotion ? { width: `${levelInfo.progress}%` } : { width: 0 }}
          animate={{ width: `${levelInfo.progress}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>

      {/* Level markers */}
      <div className="flex justify-between">
        {levels.slice(0, 4).map((level) => {
          const Icon = level.icon;
          const isActive = points >= level.minPoints;
          return (
            <div
              key={level.level}
              className={`flex flex-col items-center ${
                isActive ? 'text-text-primary' : 'text-text-muted opacity-50'
              }`}
            >
              <Icon size={14} style={{ color: isActive ? level.color : undefined }} />
              <span className="text-xs">{level.minPoints}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LevelBadge;
