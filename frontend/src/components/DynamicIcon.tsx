import { HelpCircle } from 'lucide-react';
import { NAME_TO_LUCIDE, EMOJI_TO_LUCIDE } from '../data/icon-catalog';

function isEmoji(str: string): boolean {
  return str.length <= 4 && /[^\x00-\x7F]/.test(str);
}

interface DynamicIconProps {
  icon: string;
  size?: number;
  className?: string;
}

/**
 * The ONLY icon renderer for stored icon values (chores, categories, rewards,
 * badges, challenges). Resolution order:
 *   1. bare lucide name / legacy "mdi:" alias → lucide component
 *   2. legacy emoji with a catalog mapping → its lucide component
 *      (renders line icons even before the v0.11 data migration runs)
 *   3. unmapped emoji (user-entered custom) → rendered as-is, sized
 *   4. anything else → HelpCircle
 */
export function DynamicIcon({ icon, size = 24, className = '' }: DynamicIconProps) {
  const raw = (icon || '').trim();

  if (raw && !isEmoji(raw)) {
    const name = raw.startsWith('mdi:') ? raw.slice(4) : raw;
    const LucideComp = NAME_TO_LUCIDE[name];
    if (LucideComp) {
      return <LucideComp size={size} className={className} />;
    }
    return <HelpCircle size={size} className={className} />;
  }

  if (raw) {
    const mapped = EMOJI_TO_LUCIDE[raw];
    const MappedComp = mapped ? NAME_TO_LUCIDE[mapped] : undefined;
    if (MappedComp) {
      return <MappedComp size={size} className={className} />;
    }
    // Custom emoji from user data — keep rendering it, honoring size
    return (
      <span
        className={className}
        style={{ fontSize: Math.round(size * 0.85), lineHeight: 1 }}
        aria-hidden="true"
      >
        {raw}
      </span>
    );
  }

  return <HelpCircle size={size} className={className} />;
}

export default DynamicIcon;
