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
    iconColor: '#58CC02',
    primaryColor: '#58CC02',
    accentColor: '#FF9600',
    description: 'Neobrutalist green with neon energy',
  },

  halloween: {
    name: 'Halloween',
    cssClass: 'theme-halloween',
    icon: Ghost,
    iconColor: '#FF6600',
    primaryColor: '#FF6600',
    accentColor: '#BF00FF',
    description: 'Neon pumpkin spooky with electric purple',
  },

  christmas: {
    name: 'Christmas',
    cssClass: 'theme-christmas',
    icon: Snowflake,
    iconColor: '#FF0033',
    primaryColor: '#FF0033',
    accentColor: '#00FF66',
    description: 'Electric festive red and neon green',
  },

  easter: {
    name: 'Easter',
    cssClass: 'theme-easter',
    icon: Egg,
    iconColor: '#BF5FFF',
    primaryColor: '#BF5FFF',
    accentColor: '#FF00AA',
    description: 'UV purple spring with neon pink blooms',
  },

  summer: {
    name: 'Summer',
    cssClass: 'theme-summer',
    icon: Sun,
    iconColor: '#00D4FF',
    primaryColor: '#00D4FF',
    accentColor: '#FF6B35',
    description: 'Electric ocean vibes with neon coral',
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
