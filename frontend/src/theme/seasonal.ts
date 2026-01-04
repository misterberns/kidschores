// Seasonal/Holiday theme overrides for KidsChores app
// CSS class-based theming with Lucide icons

import type { LucideIcon } from 'lucide-react';
import { Sparkles, Ghost, Snowflake, Egg, Sun } from 'lucide-react';

export type SeasonalTheme = 'default' | 'halloween' | 'christmas' | 'easter' | 'summer';

export interface SeasonalOverride {
  name: string;
  cssClass: string; // CSS class to apply to document
  icon: LucideIcon;
  iconColor: string;
  primaryColor: string;
  accentColor: string;
  description: string;
}

export const seasonalThemes: Record<SeasonalTheme, SeasonalOverride> = {
  default: {
    name: 'Default',
    cssClass: '',
    icon: Sparkles,
    iconColor: '#58CC02', // Duolingo Feather Green
    primaryColor: '#58CC02',
    accentColor: '#FF9600',
    description: 'Fresh Duolingo-style green theme',
  },

  halloween: {
    name: 'Halloween',
    cssClass: 'theme-halloween',
    icon: Ghost,
    iconColor: '#FF9500', // Pumpkin Orange
    primaryColor: '#FF9500',
    accentColor: '#9B59B6', // Spooky Purple
    description: 'Kid-friendly spooky with orange & purple',
  },

  christmas: {
    name: 'Christmas',
    cssClass: 'theme-christmas',
    icon: Snowflake,
    iconColor: '#D32F2F', // Festive Red
    primaryColor: '#D32F2F',
    accentColor: '#2E7D32', // Evergreen
    description: 'Cozy festive red, green & gold',
  },

  easter: {
    name: 'Easter',
    cssClass: 'theme-easter',
    icon: Egg,
    iconColor: '#A855F7', // Pastel Purple
    primaryColor: '#A855F7',
    accentColor: '#EC4899', // Pastel Pink
    description: 'Fresh spring pastels with purple & pink',
  },

  summer: {
    name: 'Summer',
    cssClass: 'theme-summer',
    icon: Sun,
    iconColor: '#0EA5E9', // Ocean Blue
    primaryColor: '#0EA5E9',
    accentColor: '#F97316', // Coral Orange
    description: 'Beach vibes with ocean blue & coral',
  },
};

// Get seasonal theme info
export function getSeasonalTheme(theme: SeasonalTheme): SeasonalOverride {
  return seasonalThemes[theme];
}

// Helper to get current season based on date
export function getCurrentSeason(): SeasonalTheme {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const day = now.getDate();

  // Halloween: October 15 - November 1
  if ((month === 9 && day >= 15) || (month === 10 && day <= 1)) {
    return 'halloween';
  }

  // Christmas: December 1 - December 31
  if (month === 11) {
    return 'christmas';
  }

  // Easter: Around April (simplified - just use April)
  if (month === 3) {
    return 'easter';
  }

  // Summer: June - August
  if (month >= 5 && month <= 7) {
    return 'summer';
  }

  return 'default';
}

// Apply seasonal CSS class to document
export function applySeasonalTheme(theme: SeasonalTheme): void {
  const root = document.documentElement;

  // Remove all seasonal classes
  Object.values(seasonalThemes).forEach((t) => {
    if (t.cssClass) {
      root.classList.remove(t.cssClass);
    }
  });

  // Add new seasonal class if not default
  const themeInfo = seasonalThemes[theme];
  if (themeInfo.cssClass) {
    root.classList.add(themeInfo.cssClass);
  }
}
