// Theme color definitions for KidsChores app
// Neobrutalist Design System
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

// Kid color palette - 8 Bold Neobrutalist Colors
// High-saturation, edgy gradients — neon in dark mode
// Light: >=3:1 contrast for white large text (WCAG AA)
// Dark: electric/neon matching #39FF14 border energy
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
    name: 'Neon Lime',
    gradient: 'from-[#2ECC0E] to-[#45B80C]',
    gradientDark: 'from-[#4ADE80] to-[#34D399]',
    primary: '#4ADE80',
    secondary: '#2ECC0E',
    lightBg: '#0A1F0A',
  },
  {
    id: 'ocean',
    name: 'Electric Blue',
    gradient: 'from-[#0088DD] to-[#00AAEE]',
    gradientDark: 'from-[#38BDF8] to-[#7DD3FC]',
    primary: '#38BDF8',
    secondary: '#0088DD',
    lightBg: '#0A1A2A',
  },
  {
    id: 'sunset',
    name: 'Hot Orange',
    gradient: 'from-[#E65100] to-[#FF6B00]',
    gradientDark: 'from-[#FB923C] to-[#F97316]',
    primary: '#FB923C',
    secondary: '#E65100',
    lightBg: '#1A1208',
  },
  {
    id: 'berry',
    name: 'Neon Red',
    gradient: 'from-[#CC0033] to-[#FF003C]',
    gradientDark: 'from-[#FB7185] to-[#F43F5E]',
    primary: '#FB7185',
    secondary: '#CC0033',
    lightBg: '#2A0A0A',
  },
  {
    id: 'grape',
    name: 'UV Purple',
    gradient: 'from-[#8B00CC] to-[#A200FF]',
    gradientDark: 'from-[#C084FC] to-[#A855F7]',
    primary: '#C084FC',
    secondary: '#8B00CC',
    lightBg: '#1A0A2A',
  },
  {
    id: 'teal',
    name: 'Toxic Teal',
    gradient: 'from-[#009980] to-[#00C9A7]',
    gradientDark: 'from-[#2DD4BF] to-[#14B8A6]',
    primary: '#2DD4BF',
    secondary: '#009980',
    lightBg: '#0A1F1A',
  },
  {
    id: 'coral',
    name: 'Hot Pink',
    gradient: 'from-[#CC0066] to-[#FF1493]',
    gradientDark: 'from-[#F472B6] to-[#EC4899]',
    primary: '#F472B6',
    secondary: '#CC0066',
    lightBg: '#2A0A1A',
  },
  {
    id: 'gold',
    name: 'Electric Gold',
    gradient: 'from-[#E6A800] to-[#FFD700]',
    gradientDark: 'from-[#FCD34D] to-[#FBBF24]',
    primary: '#FCD34D',
    secondary: '#E6A800',
    lightBg: '#1A1A08',
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

// Light theme colors - Neobrutalist (Bold, Sharp, High-Contrast)
export const lightTheme: ThemeColors = {
  background: '#F0EDE8',     // Warm cream (neobrutalist signature)
  surface: '#FFFFFF',        // White cards pop on cream
  surfaceHover: '#F5F3EF',

  text: {
    primary: '#1A1A1A',      // Near black (15:1 on cream)
    secondary: '#4A4A4A',    // Dark gray (7.6:1 on cream)
    muted: '#6B6B6B',        // Medium gray (4.5:1 on cream - AA minimum)
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

  border: '#1A1A1A',         // Black borders (neobrutalist core)
  borderStrong: '#1A1A1A',

  shadow: '4px 4px 0 #1A1A1A',
};

// Dark theme colors - Electric Neon on Deep Dark
export const darkTheme: ThemeColors = {
  background: '#0A0A0F',     // Deep OLED black
  surface: '#141420',        // Cool-tinted dark surface
  surfaceHover: '#1E1E2E',

  text: {
    primary: '#F5F5F5',      // High contrast (18:1)
    secondary: '#C8C8D0',    // Muted (10:1)
    muted: '#9494AC',        // Hints (~4.8:1 on bg-accent, WCAG AA)
    inverse: '#0A0A0F',
  },

  primary: {
    50: '#0A1F0A',
    100: '#153015',
    200: '#204520',
    300: '#2B5F2B',
    400: '#3DBB2E',
    500: '#4ADE80',          // Tailwind green-400 — vibrant, no halation
    600: '#48B84E',
    700: '#3D9E42',
    800: '#3E8E01',
    900: '#2D6A01',
  },

  secondary: {
    500: '#38BDF8',          // Tailwind sky-400
    600: '#1CB0F6',
  },

  status: {
    pending: { bg: '#1A1A0A', border: '#FBBF24', text: '#FCD34D' },
    claimed: { bg: '#0A1A2A', border: '#38BDF8', text: '#7DD3FC' },
    approved: { bg: '#0A1F0A', border: '#4ADE80', text: '#86EFAC' },
    overdue: { bg: '#2A0A0A', border: '#FB7185', text: '#FDA4AF' },
  },

  accent: '#FB923C',         // Tailwind orange-400
  purple: '#D8A8FF',
  green: '#4ADE80',          // Tailwind green-400
  red: '#FB7185',            // Tailwind rose-400
  yellow: '#FFE066',
  blue: '#38BDF8',           // Tailwind sky-400
  celebration: '#FB7185',    // Tailwind rose-400

  border: '#3A8F5A',         // Muted forest green borders
  borderStrong: '#F5F5F5',   // White for max visibility

  shadow: '4px 4px 0 #3A8F5A',
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
