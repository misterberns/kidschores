import { render, screen } from '../../test/test-utils'
import { ThemeProvider } from '../ThemeContext'
import { ThemeToggle } from '../ThemeToggle'
import { describe, it, expect, beforeEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// Read the actual CSS source for verification
const cssSource = fs.readFileSync(
  path.resolve(__dirname, '../../index.css'),
  'utf-8'
)

describe('Modern Warm Minimal Theme System', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('CSS Theme Variables', () => {
    it('defines soft border color instead of hard black', () => {
      // Old neobrutalist: --border-color: #1A1A1A
      expect(cssSource).not.toMatch(/--border-color:\s*#1A1A1A/)
      // New Modern Warm Minimal: soft warm gray
      expect(cssSource).toMatch(/--border-color:\s*#D1CDC4/)
    })

    it('defines soft box-shadow instead of hard offset shadow', () => {
      // Old: 4px 4px 0 #1A1A1A (hard offset)
      expect(cssSource).not.toMatch(/--neo-shadow:\s*4px 4px 0 #1A1A1A/)
      // New: subtle rgba-based shadow
      expect(cssSource).toMatch(/--neo-shadow:\s*0 1px 3px rgba/)
    })

    it('uses 0.5rem radius instead of 0.375rem', () => {
      expect(cssSource).toMatch(/--neo-radius:\s*0\.5rem/)
      expect(cssSource).not.toMatch(/--neo-radius:\s*0\.375rem/)
    })
  })

  describe('CSS Component Classes', () => {
    it('.card uses 1px border not 2px', () => {
      // Extract .card block
      const cardBlock = cssSource.match(/\.card\s*\{[^}]+\}/)?.[0] || ''
      expect(cardBlock).toContain('border: 1px solid')
      expect(cardBlock).not.toContain('border: 2px solid')
    })

    it('.card:hover does not use translate', () => {
      const cardHover = cssSource.match(/\.card:hover\s*\{[^}]+\}/)?.[0] || ''
      expect(cardHover).not.toContain('translate')
    })

    it('.btn does not use uppercase or letter-spacing', () => {
      const btnBlock = cssSource.match(/\.btn\s*\{[^}]+\}/)?.[0] || ''
      expect(btnBlock).not.toContain('text-transform: uppercase')
      expect(btnBlock).not.toContain('letter-spacing')
    })

    it('.btn uses 1px border not 2px', () => {
      const btnBlock = cssSource.match(/\.btn\s*\{[^}]+\}/)?.[0] || ''
      expect(btnBlock).toContain('border: 1px solid')
      expect(btnBlock).not.toContain('border: 2px solid')
    })

    it('.btn:active uses scale instead of translate', () => {
      const btnActive = cssSource.match(/\.btn:active\s*\{[^}]+\}/)?.[0] || ''
      expect(btnActive).toContain('scale(0.98)')
      expect(btnActive).not.toContain('translate(0, 0)')
    })

    it('.badge classes use 1px border not 2px', () => {
      const badgePending = cssSource.match(/\.badge-pending\s*\{[^}]+\}/)?.[0] || ''
      expect(badgePending).toContain('border: 1px solid')
      expect(badgePending).not.toContain('border: 2px solid')
    })

    it('.badge classes do not use uppercase', () => {
      // Extract the shared badge block
      const badgeShared = cssSource.match(
        /\.badge-pending,\s*\n?\.badge-claimed,\s*\n?\.badge-approved,\s*\n?\.badge-overdue\s*\{[^}]+\}/
      )?.[0] || ''
      expect(badgeShared).not.toContain('text-transform: uppercase')
    })

    it('.neo-card uses 1px border not 2px', () => {
      const neoCard = cssSource.match(/\.neo-card\s*\{[^}]+\}/)?.[0] || ''
      expect(neoCard).toContain('border: 1px solid')
      expect(neoCard).not.toContain('border: 2px solid')
    })

    it('.neo-btn does not use uppercase', () => {
      const neoBtn = cssSource.match(/\.neo-btn\s*\{[^}]+\}/)?.[0] || ''
      expect(neoBtn).not.toContain('text-transform: uppercase')
      expect(neoBtn).not.toContain('letter-spacing')
    })

    it('no comment headers reference "Neobrutalist"', () => {
      // Section headers should say "Modern Warm Minimal"
      expect(cssSource).not.toMatch(/Neobrutalist/)
    })
  })

  describe('Seasonal Dark Mode Tokens', () => {
    it('seasonal dark themes use soft shadows not hard offset', () => {
      // Check that no seasonal dark block has "4px 4px 0"
      const hardShadowPattern = /\.theme-\w+\.dark[\s\S]*?--neo-shadow:\s*4px 4px 0/
      expect(cssSource).not.toMatch(hardShadowPattern)
    })
  })

  describe('ThemeToggle Component', () => {
    it('renders without crashing', () => {
      render(<ThemeToggle />)
      // ThemeToggle should render a button
      const button = document.querySelector('button')
      expect(button).toBeTruthy()
    })
  })
})
