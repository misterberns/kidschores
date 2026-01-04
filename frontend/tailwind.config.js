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
        seasonal: {
          primary: 'var(--seasonal-primary)',
          accent: 'var(--seasonal-accent)',
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
        },
        // Kid color palette - Duolingo-Style Vibrant Colors
        kid: {
          lime: { from: '#58CC02', to: '#89E219' },      // Feather Green
          ocean: { from: '#1CB0F6', to: '#00D4FF' },     // Sky Blue
          sunset: { from: '#FF9600', to: '#FFBE00' },    // Warm Orange
          berry: { from: '#FF4B4B', to: '#FF7676' },     // Berry Red
          grape: { from: '#CE82FF', to: '#A855F7' },     // Grape Purple
          teal: { from: '#2DD4BF', to: '#14B8A6' },      // Fresh Teal
          coral: { from: '#FF6B6B', to: '#FF8E8E' },     // Soft Coral
          gold: { from: '#FFD93D', to: '#FFC107' },      // Golden Yellow
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      transitionDuration: {
        'theme': '200ms',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.1)',
        'seasonal': 'var(--seasonal-glow)',
      },
    },
  },
  plugins: [],
}
