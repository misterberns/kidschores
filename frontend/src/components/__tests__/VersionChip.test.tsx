/**
 * VersionChip (v0.17.0): always-visible version in the header. The text must
 * NOT contain "KidsChores v" — the Help page e2e locator filters .font-mono on
 * that prefix and a second match would break its strict mode.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VersionChip } from '../VersionChip'

describe('VersionChip (v0.17.0)', () => {
  it('renders the v-prefixed build version', () => {
    render(<VersionChip />)
    const chip = screen.getByTestId('version-chip')
    expect(chip).toHaveTextContent('v0.0.0-test')
    expect(chip.textContent).not.toContain('KidsChores')
  })
})
