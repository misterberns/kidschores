import { useTheme } from '../theme';

/**
 * Kid avatar circle — emoji if the kid has one picked (per-device, stored
 * alongside the kid color in ThemeContext), else the name initial, on the
 * kid's color. Replaces the scattered initial-in-a-circle implementations.
 */
export function KidAvatar({
  kidId,
  kidName,
  size = 'md',
  className = '',
}: {
  kidId: string;
  kidName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const { getKidColor, getKidEmoji } = useTheme();
  const color = getKidColor(kidId, kidName);
  const emoji = getKidEmoji(kidId);

  const sizeClasses = {
    sm: 'w-8 h-8 text-base',
    md: 'w-10 h-10 text-lg',
    lg: 'w-16 h-16 text-3xl',
  }[size];

  return (
    <div
      className={`${sizeClasses} rounded-full flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ backgroundColor: color.primary }}
      aria-hidden="true"
    >
      {emoji ? (
        <span className="leading-none">{emoji}</span>
      ) : (
        <span className="font-bold text-white leading-none">
          {kidName.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

/** Curated emoji set for the avatar picker — friendly, kid-appropriate. */
export const AVATAR_EMOJIS = [
  '🦁', '🐯', '🐼', '🦊', '🐸', '🦄', '🐶', '🐱',
  '🐵', '🐧', '🦖', '🐙', '🦋', '🐢', '🚀', '⚽',
  '🎨', '🎸', '🌟', '🌈', '🍕', '🧁', '🤖', '👾',
];
