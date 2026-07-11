import { render } from '../../test/test-utils'
import { DynamicIcon } from '../DynamicIcon'
import { describe, it, expect } from 'vitest'

describe('DynamicIcon', () => {
  it('renders a bare lucide name as an svg', () => {
    const { container } = render(<DynamicIcon icon="bed" />)
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('renders a legacy "mdi:" alias as an svg', () => {
    const { container } = render(<DynamicIcon icon="mdi:gift" />)
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('renders a mapped legacy emoji as a line icon (svg), not the emoji glyph', () => {
    const { container } = render(<DynamicIcon icon="🧹" />)
    expect(container.querySelector('svg')).toBeTruthy()
    expect(container.textContent).not.toContain('🧹')
  })

  it('renders an unmapped emoji as-is inside a span (no svg)', () => {
    const { container } = render(<DynamicIcon icon="🦖" />)
    expect(container.querySelector('svg')).toBeFalsy()
    expect(container.textContent).toContain('🦖')
  })

  it('falls back to a HelpCircle svg for an unknown string', () => {
    const { container } = render(<DynamicIcon icon="not-an-icon" />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
