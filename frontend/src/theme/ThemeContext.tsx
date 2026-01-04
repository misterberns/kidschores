import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { lightTheme, darkTheme, type ThemeColors, kidColorPalette, getKidColor as getKidColorById } from './colors';
import { seasonalThemes, getCurrentSeason, applySeasonalTheme, type SeasonalTheme, type SeasonalOverride } from './seasonal';

export type ThemeMode = 'light' | 'dark' | 'system';

interface KidColorValue {
  id: string;
  gradient: string;
  primary: string;
}

interface ThemeContextValue {
  // Theme mode (light/dark)
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;

  // Seasonal theme
  seasonal: SeasonalTheme;
  setSeasonal: (theme: SeasonalTheme) => void;
  seasonalOverride: SeasonalOverride;

  // Colors
  colors: ThemeColors;

  // Kid colors (per-kid customization)
  kidColors: Record<string, KidColorValue>;
  setKidColor: (kidId: string, colorId: string) => void;
  getKidColor: (kidId: string, kidName: string) => KidColorValue;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Storage keys
const THEME_MODE_KEY = 'kidschores-theme-mode';
const SEASONAL_KEY = 'kidschores-seasonal-theme';
const KID_COLORS_KEY = 'kidschores-kid-colors';

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage or defaults
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_MODE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    }
    return 'system';
  });

  const [seasonal, setSeasonalState] = useState<SeasonalTheme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(SEASONAL_KEY);
      if (stored && stored in seasonalThemes) {
        return stored as SeasonalTheme;
      }
    }
    return getCurrentSeason();
  });

  const [kidColorMap, setKidColorMap] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(KID_COLORS_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return {};
        }
      }
    }
    return {};
  });

  // Determine actual dark mode based on mode setting and system preference
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const isDark = mode === 'dark' || (mode === 'system' && systemPrefersDark);

  // Apply dark mode class to document
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Apply seasonal theme CSS class
  useEffect(() => {
    applySeasonalTheme(seasonal);
  }, [seasonal]);

  // Persist to localStorage
  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(THEME_MODE_KEY, newMode);
  };

  const setSeasonal = (newSeasonal: SeasonalTheme) => {
    setSeasonalState(newSeasonal);
    localStorage.setItem(SEASONAL_KEY, newSeasonal);
  };

  const setKidColor = (kidId: string, colorId: string) => {
    const newColors = { ...kidColorMap, [kidId]: colorId };
    setKidColorMap(newColors);
    localStorage.setItem(KID_COLORS_KEY, JSON.stringify(newColors));
  };

  const getKidColor = (kidId: string, _kidName: string): KidColorValue => {
    // If kid has a custom color, use it
    if (kidId in kidColorMap) {
      const colorInfo = getKidColorById(kidColorMap[kidId]);
      return {
        id: colorInfo.id,
        gradient: isDark ? colorInfo.gradientDark : colorInfo.gradient,
        primary: colorInfo.primary,
      };
    }
    // Hash the kid ID (not name) to get consistent but unique colors
    // This ensures each kid gets a different color even if names start with same letter
    const hash = kidId.split('').reduce((acc, char, idx) => {
      return char.charCodeAt(0) + ((acc << 5) - acc) + idx;
    }, 0);
    const index = Math.abs(hash) % kidColorPalette.length;
    const colorInfo = kidColorPalette[index];
    return {
      id: colorInfo.id,
      gradient: isDark ? colorInfo.gradientDark : colorInfo.gradient,
      primary: colorInfo.primary,
    };
  };

  const seasonalOverride = seasonalThemes[seasonal];
  const colors = isDark ? darkTheme : lightTheme;

  const value: ThemeContextValue = {
    mode,
    setMode,
    isDark,
    seasonal,
    setSeasonal,
    seasonalOverride,
    colors,
    kidColors: Object.fromEntries(
      Object.entries(kidColorMap).map(([id, colorId]) => {
        const colorInfo = getKidColorById(colorId);
        return [
          id,
          {
            id: colorInfo.id,
            gradient: isDark ? colorInfo.gradientDark : colorInfo.gradient,
            primary: colorInfo.primary,
          },
        ];
      })
    ),
    setKidColor,
    getKidColor,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
