import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { lightTheme, darkTheme, type ThemeColors, kidColorPalette, getKidColor as getKidColorById } from './colors';

export type ThemeMode = 'light' | 'dark' | 'system';

interface KidColorValue {
  id: string;
  /** CSS class ('kid-cyan') that sets --kid-accent for the subtree */
  className: string;
  /** Accent hex for the CURRENT mode (dark flagship / deepened light) */
  accent: string;
  /** Back-compat alias of accent */
  primary: string;
}

interface ThemeContextValue {
  // Theme mode (light/dark)
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;

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
const KID_COLORS_KEY = 'kidschores-kid-colors';

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage; the app is DARK-FIRST — dark is the
  // flagship theme and the default for new devices.
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_MODE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    }
    return 'dark';
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

  // Persist to localStorage
  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(THEME_MODE_KEY, newMode);
  };

  const setKidColor = (kidId: string, colorId: string) => {
    const newColors = { ...kidColorMap, [kidId]: colorId };
    setKidColorMap(newColors);
    localStorage.setItem(KID_COLORS_KEY, JSON.stringify(newColors));
  };

  const toValue = (colorId: string): KidColorValue => {
    const colorInfo = getKidColorById(colorId);
    const accent = isDark ? colorInfo.accent : colorInfo.accentLight;
    return {
      id: colorInfo.id,
      className: colorInfo.className,
      accent,
      primary: accent,
    };
  };

  const getKidColor = (kidId: string, _kidName: string): KidColorValue => {
    // If kid has a custom color, use it (legacy ids resolve in colors.ts)
    if (kidId in kidColorMap) {
      return toValue(kidColorMap[kidId]);
    }
    // Hash the kid ID (not name) to get consistent but unique colors
    const hash = kidId.split('').reduce((acc, char, idx) => {
      return char.charCodeAt(0) + ((acc << 5) - acc) + idx;
    }, 0);
    const index = Math.abs(hash) % kidColorPalette.length;
    return toValue(kidColorPalette[index].id);
  };

  const colors = isDark ? darkTheme : lightTheme;

  const value: ThemeContextValue = {
    mode,
    setMode,
    isDark,
    colors,
    kidColors: Object.fromEntries(
      Object.entries(kidColorMap).map(([id, colorId]) => [id, toValue(colorId)])
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
