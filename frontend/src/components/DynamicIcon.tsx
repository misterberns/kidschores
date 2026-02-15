import {
  Gift, Star, Award, Trophy, AlertTriangle,
  Flame, Zap, Crown, Target, Rocket, Sparkles,
  Heart, Music, Gamepad2, Tv, BookOpen, Palette,
  ShoppingBag, DollarSign, Clock, Calendar,
  Camera, Bike, Pizza, IceCreamCone, PartyPopper,
  type LucideIcon,
} from 'lucide-react';

// Map MDI icon names to Lucide equivalents
const MDI_TO_LUCIDE: Record<string, LucideIcon> = {
  // Backend defaults
  'gift': Gift,
  'medal': Award,
  'alert': AlertTriangle,
  'star': Star,
  // Extended
  'trophy': Trophy,
  'trophy-award': Trophy,
  'award': Award,
  'fire': Flame,
  'flame': Flame,
  'lightning-bolt': Zap,
  'zap': Zap,
  'crown': Crown,
  'target': Target,
  'rocket': Rocket,
  'rocket-launch': Rocket,
  'sparkles': Sparkles,
  'heart': Heart,
  'music': Music,
  'gamepad': Gamepad2,
  'gamepad-variant': Gamepad2,
  'television': Tv,
  'book-open': BookOpen,
  'palette': Palette,
  'shopping': ShoppingBag,
  'cash': DollarSign,
  'clock': Clock,
  'calendar': Calendar,
  'camera': Camera,
  'bicycle': Bike,
  'pizza': Pizza,
  'ice-cream': IceCreamCone,
  'party-popper': PartyPopper,
};

// Emoji fallbacks for known MDI names
const MDI_FALLBACK: Record<string, string> = {
  'gift': '🎁',
  'medal': '🏅',
  'alert': '⚠️',
  'star': '⭐',
  'trophy': '🏆',
  'fire': '🔥',
  'flame': '🔥',
  'heart': '❤️',
  'music': '🎵',
  'gamepad': '🎮',
  'crown': '👑',
  'rocket': '🚀',
  'pizza': '🍕',
  'camera': '📷',
};

function isEmoji(str: string): boolean {
  return str.length <= 4 && /[^\x00-\x7F]/.test(str);
}

interface DynamicIconProps {
  icon: string;
  size?: number;
  className?: string;
}

/**
 * Resolves icon strings to rendered icons.
 * Handles: emoji strings, "mdi:name" MDI namespace, plain icon names.
 * Falls back to emoji or default glyph.
 */
export function DynamicIcon({ icon, size = 24, className = '' }: DynamicIconProps) {
  // Direct emoji pass-through
  if (isEmoji(icon)) {
    return <span className={className}>{icon}</span>;
  }

  // Strip "mdi:" prefix
  const name = icon.startsWith('mdi:') ? icon.slice(4) : icon;

  // Lucide component lookup
  const LucideComp = MDI_TO_LUCIDE[name];
  if (LucideComp) {
    return <LucideComp size={size} className={className} />;
  }

  // Emoji fallback
  const emoji = MDI_FALLBACK[name] || '🔹';
  return <span className={className}>{emoji}</span>;
}
