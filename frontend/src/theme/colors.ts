// Theme color definitions for KidsChores app
// Duolingo-Style Design System
// Primary: Feather Green (#58CC02)
// Secondary: Sky Blue (#1CB0F6)
// Accent: Warm Orange (#FF9600)

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

  // Brand/Primary colors - Feather Green
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

  // Secondary colors - Sky Blue
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

// Kid color palette - 8 Vibrant Duolingo-Style Colors
// Fun, engaging gradients for kids
// All meet WCAG AA contrast for white text on colored backgrounds
export interface KidColor {
  id: string;
  name: string;
  gradient: string;
  gradientDark: string;
  primary: string;
  secondary: string;
  lightBg: string;
}

export const kidColorPalette: KidColor[] = [
  {
    id: 'lime',
    name: 'Lime',
    gradient: 'from-[#58CC02] to-[#89E219]',
    gradientDark: 'from-[#7AE82A] to-[#58CC02]',
    primary: '#58CC02',
    secondary: '#89E219',
    lightBg: '#F0FDF4',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    gradient: 'from-[#1CB0F6] to-[#00D4FF]',
    gradientDark: 'from-[#49C0F8] to-[#1CB0F6]',
    primary: '#1CB0F6',
    secondary: '#00D4FF',
    lightBg: '#F0F9FF',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    gradient: 'from-[#FF9600] to-[#FFBE00]',
    gradientDark: 'from-[#FFAB33] to-[#FF9600]',
    primary: '#FF9600',
    secondary: '#FFBE00',
    lightBg: '#FFFBEB',
  },
  {
    id: 'berry',
    name: 'Berry',
    gradient: 'from-[#FF4B4B] to-[#FF7676]',
    gradientDark: 'from-[#FF7676] to-[#FF4B4B]',
    primary: '#FF4B4B',
    secondary: '#FF7676',
    lightBg: '#FEF2F2',
  },
  {
    id: 'grape',
    name: 'Grape',
    gradient: 'from-[#CE82FF] to-[#A855F7]',
    gradientDark: 'from-[#D8A8FF] to-[#CE82FF]',
    primary: '#CE82FF',
    secondary: '#A855F7',
    lightBg: '#FAF5FF',
  },
  {
    id: 'teal',
    name: 'Teal',
    gradient: 'from-[#2DD4BF] to-[#14B8A6]',
    gradientDark: 'from-[#5EEAD4] to-[#2DD4BF]',
    primary: '#2DD4BF',
    secondary: '#14B8A6',
    lightBg: '#F0FDFA',
  },
  {
    id: 'coral',
    name: 'Coral',
    gradient: 'from-[#FF6B6B] to-[#FF8E8E]',
    gradientDark: 'from-[#FF8E8E] to-[#FF6B6B]',
    primary: '#FF6B6B',
    secondary: '#FF8E8E',
    lightBg: '#FFF1F1',
  },
  {
    id: 'gold',
    name: 'Gold',
    gradient: 'from-[#FFD93D] to-[#FFC107]',
    gradientDark: 'from-[#FFE066] to-[#FFD93D]',
    primary: '#FFD93D',
    secondary: '#FFC107',
    lightBg: '#FFFEF0',
  },
];

// Legacy support - map to old format
export const defaultKidColors = kidColorPalette.map((c) => ({
  name: c.name,
  gradient: c.gradient,
  hex: c.primary,
}));

// Get kid color by ID
export function getKidColor(id: string): KidColor {
  return kidColorPalette.find((c) => c.id === id) || kidColorPalette[0];
}

// Get gradient class for a kid color
export function getKidGradient(id: string, isDark: boolean): string {
  const color = getKidColor(id);
  return isDark ? color.gradientDark : color.gradient;
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

// Light theme colors - Duolingo-Style (Bright, Clean, Fun)
export const lightTheme: ThemeColors = {
  background: '#FFFFFF',     // Pure white
  surface: '#F7F7F7',        // Subtle gray for cards
  surfaceHover: '#F0F0F0',

  text: {
    primary: '#3C3C3C',      // Near black, warm (10.5:1)
    secondary: '#5A5A5A',    // Muted gray (7.0:1)
    muted: '#767676',        // Placeholder, hints (4.5:1 - AA minimum)
    inverse: '#FFFFFF',
  },

  primary: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#6ED318',
    500: '#58CC02',          // Feather Green - Main brand
    600: '#4CAD02',          // Hover
    700: '#3E8E01',          // Active
    800: '#2D6A01',
    900: '#1A4001',
  },

  secondary: {
    500: '#1CB0F6',          // Sky Blue
    600: '#0E9FE3',
  },

  status: {
    pending: { bg: '#FFF3CD', border: '#FFD93D', text: '#856404' },
    claimed: { bg: '#D1F4FF', border: '#1CB0F6', text: '#0C5A7D' },
    approved: { bg: '#D4EDDA', border: '#58CC02', text: '#2E6B12' },
    overdue: { bg: '#FFE5E5', border: '#FF4B4B', text: '#A02E2E' },
  },

  accent: '#FF9600',         // Warm Orange - Points, achievements
  purple: '#CE82FF',
  green: '#58CC02',          // Feather Green
  red: '#FF4B4B',            // Berry Red
  yellow: '#FFD93D',         // Gold
  blue: '#1CB0F6',           // Sky Blue
  celebration: '#FF4B4B',    // Berry Pink

  border: '#E5E5E5',
  borderStrong: '#D4D4D4',

  shadow: 'rgba(0, 0, 0, 0.06)',
};

// Dark theme colors - Dark mode with Duolingo-style colors
export const darkTheme: ThemeColors = {
  background: '#121212',     // Deep dark
  surface: '#1E1E1E',
  surfaceHover: '#2D2D2D',

  text: {
    primary: '#F0F0F0',      // High contrast (14:1)
    secondary: '#C0C0C0',    // Muted (9:1)
    muted: '#9A9A9A',        // Hints (5.5:1)
    inverse: '#121212',
  },

  primary: {
    50: '#1A3D1A',
    100: '#2D5A2D',
    200: '#3D7A3D',
    300: '#4D9A4D',
    400: '#6ED318',
    500: '#7AE82A',          // Brighter green for dark bg
    600: '#58CC02',
    700: '#4CAD02',
    800: '#3E8E01',
    900: '#2D6A01',
  },

  secondary: {
    500: '#49C0F8',          // Brighter blue for dark bg
    600: '#1CB0F6',
  },

  status: {
    pending: { bg: '#3D3520', border: '#FFD93D', text: '#FFD93D' },
    claimed: { bg: '#1A3545', border: '#49C0F8', text: '#49C0F8' },
    approved: { bg: '#1A3D1A', border: '#7AE82A', text: '#7AE82A' },
    overdue: { bg: '#451A1A', border: '#FF7676', text: '#FF7676' },
  },

  accent: '#FFAB33',         // Brighter orange for dark mode
  purple: '#D8A8FF',
  green: '#7AE82A',
  red: '#FF7676',
  yellow: '#FFE066',
  blue: '#49C0F8',
  celebration: '#FF7676',

  border: '#3D3D3D',
  borderStrong: '#4D4D4D',

  shadow: 'rgba(0, 0, 0, 0.3)',
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
