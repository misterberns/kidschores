// Theme color definitions for KidsChores app
// "Midnight + Electric" design system (BRAND-GUIDELINES.md v2)
// Dark-first: blue-charcoal surfaces, electric-cyan hero accent,
// volt for points, per-kid identity via accent hues.

export interface StatusColors {
  bg: string;
  border: string;
  text: string;
}

export interface ThemeColors {
  // Base colors
  background: string;
  surface: string;
  surfaceHover: string;

  // Text colors
  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
  };

  // Brand/Primary colors — electric cyan
  primary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };

  // Secondary colors — info blue
  secondary: {
    500: string;
    600: string;
  };

  // Status colors for chores
  status: {
    pending: StatusColors;
    claimed: StatusColors;
    approved: StatusColors;
    overdue: StatusColors;
  };

  // Accent colors
  accent: string;
  purple: string;
  green: string;
  red: string;
  yellow: string;
  blue: string;
  celebration: string;

  // Border colors
  border: string;
  borderStrong: string;

  // Shadow
  shadow: string;
}

// Per-kid accent palette — 6 mid-chroma hues that stay sophisticated on the
// dark shell (and deepen automatically in light mode via the .kid-<id> CSS
// classes in index.css, which define --kid-accent / --kid-accent-soft).
// A kid's identity is an ACCENT, never a gradient block.
export interface KidColor {
  id: string;
  name: string;
  /** CSS class that sets --kid-accent / --kid-accent-soft for the subtree */
  className: string;
  /** Dark-mode (flagship) accent hex */
  accent: string;
  /** Light-mode deepened accent hex */
  accentLight: string;
}

export const kidColorPalette: KidColor[] = [
  { id: 'cyan',    name: 'Cyan',    className: 'kid-cyan',    accent: '#38BDF8', accentLight: '#0284C7' },
  { id: 'violet',  name: 'Violet',  className: 'kid-violet',  accent: '#A78BFA', accentLight: '#7C3AED' },
  { id: 'magenta', name: 'Magenta', className: 'kid-magenta', accent: '#FB6FB1', accentLight: '#DB2777' },
  { id: 'lime',    name: 'Lime',    className: 'kid-lime',    accent: '#A3E635', accentLight: '#4D7C0F' },
  { id: 'coral',   name: 'Coral',   className: 'kid-coral',   accent: '#FF7A6B', accentLight: '#EA580C' },
  { id: 'amber',   name: 'Amber',   className: 'kid-amber',   accent: '#FBBF24', accentLight: '#D97706' },
];

// Pre-redesign color ids stored in localStorage map onto the new palette.
const LEGACY_KID_COLOR_IDS: Record<string, string> = {
  ocean: 'cyan', sapphire: 'cyan', sky: 'cyan', teal: 'cyan',
  grape: 'violet', mauve: 'violet', royal: 'violet',
  berry: 'magenta', maroon: 'magenta', flamingo: 'magenta',
  forest: 'lime', green: 'lime',
  sunset: 'coral', peach: 'coral',
  gold: 'amber',
};

// Legacy support - map to old format
export const defaultKidColors = kidColorPalette.map((c) => ({
  name: c.name,
  hex: c.accent,
}));

// Get kid color by ID (accepts legacy ids)
export function getKidColor(id: string): KidColor {
  const resolved = LEGACY_KID_COLOR_IDS[id] ?? id;
  return kidColorPalette.find((c) => c.id === resolved) || kidColorPalette[0];
}

// Get kid color by index (for consistent assignment)
export function getKidColorByIndex(index: number): KidColor {
  return kidColorPalette[index % kidColorPalette.length];
}

// Hash-based color assignment for consistent kid colors
export function getKidColorFromId(kidId: string): KidColor {
  const hash = kidId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  const index = Math.abs(hash) % kidColorPalette.length;
  return kidColorPalette[index];
}

// Light variant — cool neutral, same accent system (derived from dark)
export const lightTheme: ThemeColors = {
  background: '#F2F4F7',
  surface: '#FFFFFF',
  surfaceHover: '#F9FAFB',

  text: {
    primary: '#101828',
    secondary: '#475467',
    muted: '#667085',
    inverse: '#FFFFFF',
  },

  primary: {
    50: '#E8F9FD',
    100: '#C9F1FB',
    200: '#93E3F6',
    300: '#4FD0EE',
    400: '#1FB6D9',
    500: '#0891B2',
    600: '#0E7490',
    700: '#155E75',
    800: '#164E63',
    900: '#103B4C',
  },

  secondary: {
    500: '#2E90FA',
    600: '#1570EF',
  },

  status: {
    pending: { bg: '#FFFAEB', border: '#F79009', text: '#93540A' },
    claimed: { bg: '#EFF8FF', border: '#2E90FA', text: '#175CD3' },
    approved: { bg: '#ECFDF3', border: '#12B76A', text: '#067647' },
    overdue: { bg: '#FEF3F2', border: '#F04438', text: '#B42318' },
  },

  accent: '#5C8A00',         // volt family (deepened for light)
  purple: '#7C3AED',
  green: '#12B76A',
  red: '#E11D48',
  yellow: '#F79009',
  blue: '#2E90FA',
  celebration: '#E11D48',

  border: '#E4E7EC',
  borderStrong: '#98A2B3',

  shadow: '0 1px 3px rgba(16,24,40,0.08)',
};

// Dark — Midnight + Electric (the flagship theme)
export const darkTheme: ThemeColors = {
  background: '#0B0E14',
  surface: '#141922',
  surfaceHover: '#1B2230',

  text: {
    primary: '#F4F6FB',
    secondary: '#A7B0C0',
    muted: '#8A93A6',
    inverse: '#06121A',
  },

  primary: {
    50: '#0C2530',
    100: '#0E3240',
    200: '#10465C',
    300: '#14607C',
    400: '#1FB6D9',
    500: '#38E1FF',          // hero electric cyan
    600: '#5FE8FF',
    700: '#8FEFFF',
    800: '#0E7490',
    900: '#155E75',
  },

  secondary: {
    500: '#60A5FA',
    600: '#84CAFF',
  },

  status: {
    pending: { bg: '#201A0A', border: '#FBBF24', text: '#FCD34D' },
    claimed: { bg: '#0E1A2E', border: '#60A5FA', text: '#93C5FD' },
    approved: { bg: '#0A2018', border: '#34D399', text: '#6EE7B7' },
    overdue: { bg: '#2A0E14', border: '#FB7185', text: '#FDA4AF' },
  },

  accent: '#B6F400',         // volt — points, rewards
  purple: '#A78BFA',
  green: '#34D399',
  red: '#FB7185',
  yellow: '#FBBF24',
  blue: '#60A5FA',
  celebration: '#FB7185',

  border: '#262E3D',
  borderStrong: '#A7B0C0',

  shadow: '0 1px 3px rgba(0,0,0,0.30)',
};

// Color utility functions
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

// Calculate relative luminance for WCAG contrast checking
export function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
    c = c / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Calculate contrast ratio between two colors
export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Check if contrast meets WCAG requirements
export function meetsWCAG(hex1: string, hex2: string, level: 'AA' | 'AAA' = 'AA', isLargeText = false): boolean {
  const ratio = getContrastRatio(hex1, hex2);
  if (level === 'AAA') {
    return isLargeText ? ratio >= 4.5 : ratio >= 7;
  }
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}
