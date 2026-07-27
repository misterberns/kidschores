/**
 * DAY_NAMES (v0.16.2): applicable_days indices are Python weekday() values —
 * 0=Monday..6=Sunday. The admin UI's label order IS the wire format; a
 * Sunday-first array stored every selection off by one day.
 */
import { describe, it, expect } from 'vitest'
import { DAY_NAMES } from '../utils/days'

describe('DAY_NAMES (v0.16.2)', () => {
  it('is Monday-first to match Python weekday() indices', () => {
    expect(DAY_NAMES[0]).toBe('Mon')
    expect(DAY_NAMES[6]).toBe('Sun')
    expect(DAY_NAMES).toHaveLength(7)
  })
})
