/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // CSS variable-based theming
        bg: {
          base: 'var(--bg-base)',
          surface: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
          accent: 'var(--bg-accent)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          inverse: 'var(--text-inverse)',
        },
        primary: {
          50: 'var(--primary-50)',
          100: 'var(--primary-100)',
          200: 'var(--primary-200)',
          300: 'var(--primary-300)',
          400: 'var(--primary-400)',
          500: 'var(--primary-500)',
          600: 'var(--primary-600)',
          700: 'var(--primary-700)',
          800: 'var(--primary-800)',
          900: 'var(--primary-900)',
        },
        secondary: {
          400: 'var(--secondary-400)',
          500: 'var(--secondary-500)',
          600: 'var(--secondary-600)',
        },
        accent: {
          400: 'var(--accent-400)',
          500: 'var(--accent-500)',
          600: 'var(--accent-600)',
        },
        // Destructive/error scale — static values; components pair light/dark
        // via `dark:` variants (e.g. bg-error-100 dark:bg-error-900).
        // Midnight+Electric danger family (rose).
        error: {
          50: '#FEF3F2',
          100: '#FEE4E2',
          400: '#FB7185',
          500: '#E11D48',
          700: '#B42318',
          900: '#3A1015',
        },
        // Theme-aware border tokens (Accordion et al: border-border-primary)
        border: {
          DEFAULT: 'var(--border-color)',
          primary: 'var(--border-color)',
        },
        status: {
          pending: {
            bg: 'var(--status-pending-bg)',
            border: 'var(--status-pending-border)',
            text: 'var(--status-pending-text)',
          },
          claimed: {
            bg: 'var(--status-claimed-bg)',
            border: 'var(--status-claimed-border)',
            text: 'var(--status-claimed-text)',
          },
          approved: {
            bg: 'var(--status-approved-bg)',
            border: 'var(--status-approved-border)',
            text: 'var(--status-approved-text)',
          },
          overdue: {
            bg: 'var(--status-overdue-bg)',
            border: 'var(--status-overdue-border)',
            text: 'var(--status-overdue-text)',
          },
          // Theme-aware error accent (AnimatedPoints/AnimatedBadge):
          // #FF4B4B light / #FB7185 dark via the celebration token.
          error: 'var(--celebration)',
        },
        // Kid accent utility (canonical definitions live in index.css as
        // .kid-<id> { --kid-accent } — consume via var(--kid-accent))
        kid: {
          accent: 'var(--kid-accent)',
        },
      },
      fontFamily: {
        // Inter body + Space Grotesk display (both loaded in index.css).
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      borderRadius: {
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
      transitionDuration: {
        'theme': '200ms',
      },
      boxShadow: {
        // Map to the theme-aware --neo-shadow* tokens defined per theme in
        // index.css (the previously-referenced --shadow-* vars never existed,
        // making these utilities silent no-ops — UX-REVIEW-2026-07 P0.1).
        'card': 'var(--neo-shadow)',
        'card-hover': 'var(--neo-shadow-hover)',
        'sm': 'var(--neo-shadow-sm)',
        'md': 'var(--neo-shadow)',
        'lg': 'var(--neo-shadow-hover)',
      },
    },
  },
  plugins: [],
}
