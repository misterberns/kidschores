/**
 * Curated icon vocabulary for chores, categories, and rewards.
 *
 * Single source of truth for:
 *  - the IconPicker grid (id + label + search keywords)
 *  - DynamicIcon's name→component resolution
 *  - the emoji→icon mapping used at render time for not-yet-migrated data
 *    (mirrored as EMOJI_TO_LUCIDE in backend/app/migrations/icon_migration.py —
 *    keep the two in sync)
 */
import {
  Bed, Utensils, ShowerHead, Sofa, Trees, BookOpen, Book, Dog, Cat, PawPrint,
  Shirt, Trash2, Sprout, Brush, Sparkles, WashingMachine, CookingPot,
  Smartphone, Pizza, IceCreamCone, Moon, Clapperboard, Gamepad2, ToyBrick,
  Gift, Backpack, Music, Palette, Bike, Car, Dumbbell, Folder, Star, Heart,
  Medal, PartyPopper, Pencil, Trophy, Flame, Crown, Rocket, Camera,
  AlertTriangle, Zap, Target, Award, Clock, Calendar, ShoppingBag, DollarSign,
  Tv, CheckCircle2,
  type LucideIcon,
} from 'lucide-react';

export interface IconEntry {
  id: string;          // lucide kebab-case name — the value stored in the DB
  label: string;       // human label in the picker
  keywords: string;    // extra search terms
  Component: LucideIcon;
}

// The picker grid (ordered roughly by chore-domain usefulness)
export const ICON_CATALOG: IconEntry[] = [
  { id: 'brush', label: 'Cleaning', keywords: 'sweep broom scrub tidy', Component: Brush },
  { id: 'sparkles', label: 'Sparkle', keywords: 'clean shine polish', Component: Sparkles },
  { id: 'bed', label: 'Bed', keywords: 'bedroom sleep make', Component: Bed },
  { id: 'utensils', label: 'Dishes', keywords: 'kitchen table eat fork', Component: Utensils },
  { id: 'cooking-pot', label: 'Cooking', keywords: 'kitchen meal pot', Component: CookingPot },
  { id: 'shower-head', label: 'Bathroom', keywords: 'shower bath wash', Component: ShowerHead },
  { id: 'sofa', label: 'Living room', keywords: 'couch tidy', Component: Sofa },
  { id: 'trees', label: 'Outdoor', keywords: 'yard garden outside', Component: Trees },
  { id: 'sprout', label: 'Plants', keywords: 'water grow garden', Component: Sprout },
  { id: 'trash-2', label: 'Trash', keywords: 'garbage bin rubbish', Component: Trash2 },
  { id: 'shirt', label: 'Laundry', keywords: 'clothes fold', Component: Shirt },
  { id: 'washing-machine', label: 'Washing', keywords: 'laundry machine', Component: WashingMachine },
  { id: 'book-open', label: 'Homework', keywords: 'school study', Component: BookOpen },
  { id: 'book', label: 'Reading', keywords: 'book story', Component: Book },
  { id: 'backpack', label: 'School bag', keywords: 'school pack', Component: Backpack },
  { id: 'pencil', label: 'Writing', keywords: 'draw write', Component: Pencil },
  { id: 'dog', label: 'Dog', keywords: 'pet walk feed', Component: Dog },
  { id: 'cat', label: 'Cat', keywords: 'pet litter feed', Component: Cat },
  { id: 'paw-print', label: 'Pets', keywords: 'animal care', Component: PawPrint },
  { id: 'smartphone', label: 'Screen time', keywords: 'phone tablet', Component: Smartphone },
  { id: 'gamepad-2', label: 'Games', keywords: 'video game play', Component: Gamepad2 },
  { id: 'clapperboard', label: 'Movie', keywords: 'film night tv', Component: Clapperboard },
  { id: 'tv', label: 'TV', keywords: 'television show', Component: Tv },
  { id: 'music', label: 'Music', keywords: 'song practice', Component: Music },
  { id: 'palette', label: 'Art', keywords: 'paint craft draw', Component: Palette },
  { id: 'bike', label: 'Bike', keywords: 'ride cycle', Component: Bike },
  { id: 'car', label: 'Car', keywords: 'wash drive', Component: Car },
  { id: 'dumbbell', label: 'Exercise', keywords: 'sport workout', Component: Dumbbell },
  { id: 'pizza', label: 'Pizza', keywords: 'dinner food', Component: Pizza },
  { id: 'ice-cream-cone', label: 'Ice cream', keywords: 'treat dessert', Component: IceCreamCone },
  { id: 'moon', label: 'Bedtime', keywords: 'night stay up late', Component: Moon },
  { id: 'toy-brick', label: 'Toys', keywords: 'lego play tidy', Component: ToyBrick },
  { id: 'gift', label: 'Gift', keywords: 'reward present', Component: Gift },
  { id: 'star', label: 'Star', keywords: 'points favorite', Component: Star },
  { id: 'heart', label: 'Heart', keywords: 'love kindness', Component: Heart },
  { id: 'party-popper', label: 'Party', keywords: 'celebrate fun', Component: PartyPopper },
  { id: 'folder', label: 'Folder', keywords: 'category general', Component: Folder },
];

// Extra resolvable names that aren't in the picker grid (badges/challenges/
// legacy mdi values keep rendering)
const EXTRA_ICONS: Record<string, LucideIcon> = {
  'medal': Medal,
  'trophy': Trophy,
  'trophy-award': Trophy,
  'award': Award,
  'flame': Flame,
  'fire': Flame,
  'zap': Zap,
  'lightning-bolt': Zap,
  'crown': Crown,
  'target': Target,
  'rocket': Rocket,
  'rocket-launch': Rocket,
  'camera': Camera,
  'alert': AlertTriangle,
  'alert-triangle': AlertTriangle,
  'clock': Clock,
  'calendar': Calendar,
  'shopping': ShoppingBag,
  'shopping-bag': ShoppingBag,
  'cash': DollarSign,
  'television': Tv,
  'gamepad': Gamepad2,
  'gamepad-variant': Gamepad2,
  'bicycle': Bike,
  'ice-cream': IceCreamCone,
  'check-circle': CheckCircle2,
};

// name (bare lucide or legacy mdi alias) → component
export const NAME_TO_LUCIDE: Record<string, LucideIcon> = {
  ...Object.fromEntries(ICON_CATALOG.map(e => [e.id, e.Component])),
  ...EXTRA_ICONS,
};

// Legacy emoji values (pre-v0.11 data, seeds, and templates) → lucide names.
// Mirrored in backend/app/migrations/icon_migration.py — keep in sync.
export const EMOJI_TO_LUCIDE: Record<string, string> = {
  '📁': 'folder',
  '🧹': 'brush',
  '🧽': 'sparkles',
  '🪥': 'brush',
  '🛏️': 'bed',
  '🍽️': 'utensils',
  '🍳': 'cooking-pot',
  '🚿': 'shower-head',
  '🛋️': 'sofa',
  '🌳': 'trees',
  '🌱': 'sprout',
  '🗑️': 'trash-2',
  '👕': 'shirt',
  '🧺': 'washing-machine',
  '📚': 'book-open',
  '📖': 'book',
  '✏️': 'pencil',
  '🐕': 'dog',
  '🐱': 'cat',
  '🐾': 'paw-print',
  '📱': 'smartphone',
  '🎮': 'gamepad-2',
  '🎬': 'clapperboard',
  '🎵': 'music',
  '🍕': 'pizza',
  '🍦': 'ice-cream-cone',
  '🌙': 'moon',
  '🧸': 'toy-brick',
  '🎁': 'gift',
  '⭐': 'star',
  '❤️': 'heart',
  '🏆': 'trophy',
  '🏅': 'medal',
  '🔥': 'flame',
  '👑': 'crown',
  '🚀': 'rocket',
  '📷': 'camera',
  '⚠️': 'alert-triangle',
  '🎉': 'party-popper',
};
