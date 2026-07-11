import { render } from '../../test/test-utils'
import { ThemeProvider, useTheme } from '../ThemeContext'
import { ThemeToggle } from '../ThemeToggle'
import { getKidColor, kidColorPalette } from '../colors'
import { describe, it, expect, beforeEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// Read the actual CSS source for verification
const cssSource = fs.readFileSync(
  path.resolve(__dirname, '../../index.css'),
  'utf-8'
)

describe('Midnight + Electric Theme System', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('CSS Theme Variables', () => {
    it('dark theme uses the Midnight surfaces', () => {
      expect(cssSource).toMatch(/--bg-base:\s*#0B0E14/)
      expect(cssSource).toMatch(/--bg-elevated:\s*#1B2230/)
    })

    it('dark hero accent is electric cyan', () => {
      expect(cssSource).toMatch(/--primary-500:\s*#38E1FF/)
    })

    it('dark points accent is volt', () => {
      expect(cssSource).toMatch(/--accent-500:\s*#B6F400/)
    })

    it('defines the streak gradient tokens', () => {
      expect(cssSource).toMatch(/--streak-from/)
      expect(cssSource).toMatch(/--streak-to/)
    })

    it('defines soft box-shadow instead of hard offset shadow', () => {
      expect(cssSource).not.toMatch(/--neo-shadow:\s*4px 4px 0/)
      expect(cssSource).toMatch(/--neo-shadow:\s*0 1px 3px rgba/)
    })
  })

  describe('Retired systems stay retired', () => {
    it('no seasonal theme classes remain', () => {
      expect(cssSource).not.toMatch(/\.theme-halloween/)
      expect(cssSource).not.toMatch(/\.theme-christmas/)
      expect(cssSource).not.toMatch(/--seasonal-/)
    })

    it('no Chorbie animation classes remain', () => {
      expect(cssSource).not.toMatch(/chorbie/i)
    })

    it('no kid gradient blocks remain (accents only)', () => {
      expect(cssSource).not.toMatch(/\.kid-\w+\s*\{\s*background:\s*linear-gradient/)
      expect(cssSource).toMatch(/--kid-accent:/)
    })
  })

  describe('CSS Component Classes', () => {
    it('.card uses 1px border not 2px', () => {
      const cardBlock = cssSource.match(/\.card\s*\{[^}]+\}/)?.[0] || ''
      expect(cardBlock).toContain('border: 1px solid')
      expect(cardBlock).not.toContain('border: 2px solid')
    })

    it('.btn:active uses scale instead of translate', () => {
      const btnActive = cssSource.match(/\.btn:active\s*\{[^}]+\}/)?.[0] || ''
      expect(btnActive).toContain('scale(0.98)')
      expect(btnActive).not.toContain('translate(0, 0)')
    })

    it('.ring-progress renders a conic gradient', () => {
      const ring = cssSource.match(/\.ring-progress\s*\{[^}]+\}/)?.[0] || ''
      expect(ring).toContain('conic-gradient')
      expect(ring).toContain('--ring-pct')
    })

    it('.kid-card carries the accent edge', () => {
      const kidCard = cssSource.match(/\.kid-card\s*\{[^}]+\}/)?.[0] || ''
      expect(kidCard).toContain('inset 3px 0 0 var(--kid-accent')
    })
  })

  describe('Kid accent palette', () => {
    it('has 6 accents with class names', () => {
      expect(kidColorPalette).toHaveLength(6)
      for (const c of kidColorPalette) {
        expect(c.className).toBe(`kid-${c.id}`)
        expect(c.accent).toMatch(/^#[0-9A-Fa-f]{6}$/)
        expect(c.accentLight).toMatch(/^#[0-9A-Fa-f]{6}$/)
        // every accent class must exist in the CSS
        expect(cssSource).toContain(`.${c.className}`)
      }
    })

    it('resolves legacy color ids onto the new palette', () => {
      expect(getKidColor('ocean').id).toBe('cyan')
      expect(getKidColor('berry').id).toBe('magenta')
      expect(getKidColor('grape').id).toBe('violet')
      expect(getKidColor('gold').id).toBe('amber')
      expect(getKidColor('nonsense').id).toBe(kidColorPalette[0].id)
    })
  })

  describe('ThemeContext', () => {
    it('defaults to dark mode (dark-first design)', () => {
      let captured: { isDark: boolean } | null = null
      function Probe() {
        const { isDark } = useTheme()
        captured = { isDark }
        return null
      }
      render(
        <ThemeProvider>
          <Probe />
        </ThemeProvider>
      )
      expect(captured!.isDark).toBe(true)
    })

    it('respects a stored light preference', () => {
      localStorage.setItem('kidschores-theme-mode', 'light')
      let captured: { isDark: boolean } | null = null
      function Probe() {
        const { isDark } = useTheme()
        captured = { isDark }
        return null
      }
      render(
        <ThemeProvider>
          <Probe />
        </ThemeProvider>
      )
      expect(captured!.isDark).toBe(false)
    })
  })

  describe('ThemeToggle Component', () => {
    it('renders without crashing (no season selector)', () => {
      render(<ThemeToggle />)
      const button = document.querySelector('button')
      expect(button).toBeTruthy()
      expect(document.body.textContent).not.toContain('Season')
    })
  })
})
