import { useTheme } from '../theme';

/**
 * Kid avatar — the kid's name initial in an accent-tinted ring keyed to their
 * per-device color. A kid's identity is an ACCENT, never a solid color block.
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
  const { getKidColor } = useTheme();
  const color = getKidColor(kidId, kidName);

  const sizeClasses = {
    sm: 'w-8 h-8 text-base',
    md: 'w-10 h-10 text-lg',
    lg: 'w-16 h-16 text-3xl',
  }[size];

  return (
    <div
      className={`${sizeClasses} kid-avatar-ring ${color.className} rounded-xl flex items-center justify-center flex-shrink-0 ${className}`}
      aria-hidden="true"
    >
      <span className="font-display font-bold leading-none">
        {kidName.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}
