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
        // Kid color palette - Refined Vibrant Colors
        kid: {
          lime: { from: '#34B233', to: '#4CC552' },
          ocean: { from: '#1A8FD6', to: '#3BA6E0' },
          sunset: { from: '#E86A10', to: '#F58D3D' },
          berry: { from: '#D93654', to: '#E85A74' },
          grape: { from: '#8A4FBF', to: '#A36DD5' },
          teal: { from: '#0D9E8A', to: '#2DB8A6' },
          coral: { from: '#D44590', to: '#E066A8' },
          gold: { from: '#E6A800', to: '#F0C030' },
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
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
        'card': 'var(--shadow-sm)',
        'card-hover': 'var(--shadow-md)',
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'seasonal': 'var(--seasonal-glow)',
      },
    },
  },
  plugins: [],
}
