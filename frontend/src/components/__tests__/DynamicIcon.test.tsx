import { render } from '../../test/test-utils'
import { DynamicIcon } from '../DynamicIcon'
import { ICON_CATALOG, NAME_TO_ICON, EMOJI_TO_LUCIDE } from '../../data/icon-catalog'
import { TWEMOJI_ICONS } from '../../data/twemoji-icons'
import { describe, it, expect } from 'vitest'

describe('DynamicIcon', () => {
  it('renders a bare stored name as Twemoji artwork (svg with the twemoji viewBox)', () => {
    const { container } = render(<DynamicIcon icon="bed" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg?.getAttribute('viewBox')).toBe('0 0 36 36')
  })

  it('renders a legacy "mdi:" alias as an svg', () => {
    const { container } = render(<DynamicIcon icon="mdi:gift" />)
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('renders a mapped legacy emoji as consistent artwork (svg), not the native glyph', () => {
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

  it('honors the size prop on artwork', () => {
    const { container } = render(<DynamicIcon icon="pizza" size={32} />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('width')).toBe('32')
    expect(svg?.getAttribute('height')).toBe('32')
  })
})

describe('icon catalog ↔ twemoji completeness', () => {
  it('every picker catalog id has vendored Twemoji artwork', () => {
    const missing = ICON_CATALOG.filter(e => !TWEMOJI_ICONS[e.id]).map(e => e.id)
    expect(missing).toEqual([])
  })

  it('every resolvable name (catalog + extras) maps to a real component', () => {
    const broken = Object.entries(NAME_TO_ICON)
      .filter(([, Comp]) => typeof Comp !== 'function' && typeof Comp !== 'object')
      .map(([name]) => name)
    expect(broken).toEqual([])
  })

  it('every legacy-emoji mapping target resolves to a component', () => {
    const dangling = Object.values(EMOJI_TO_LUCIDE).filter(name => !NAME_TO_ICON[name])
    expect(dangling).toEqual([])
  })
})
