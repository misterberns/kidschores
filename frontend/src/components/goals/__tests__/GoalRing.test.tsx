/**
 * Savings goals (v0.16.0): the nearest-complete picker that drives the compact
 * Home-card ring, the $ formatter, and the piggy-bank icon-catalog alias.
 */
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { pickTopGoal, formatGoalDollars } from '../GoalRing'
import { DynamicIcon } from '../../DynamicIcon'
import type { GoalsListResponse, SavingsGoal } from '../../../api/client'

function goal(overrides: Partial<SavingsGoal>): SavingsGoal {
  return {
    id: 'g1',
    kid_id: 'k1',
    name: 'Goal',
    icon: 'piggy-bank',
    target_points: 500,
    target_date: null,
    status: 'active',
    payout_id: null,
    completed_at: null,
    created_at: '2026-07-01T00:00:00',
    progress_pct: 0,
    reached: false,
    ...overrides,
  }
}

function listResponse(goals: SavingsGoal[]): GoalsListResponse {
  return { kid_id: 'k1', current_points: 0, points_per_dollar: 100, goals }
}

describe('pickTopGoal (v0.16.0)', () => {
  it('returns null with no data or no active goals', () => {
    expect(pickTopGoal(undefined)).toBeNull()
    expect(pickTopGoal(listResponse([]))).toBeNull()
    expect(pickTopGoal(listResponse([goal({ status: 'completed' })]))).toBeNull()
  })

  it('picks the nearest-complete active goal', () => {
    const a = goal({ id: 'a', progress_pct: 20 })
    const b = goal({ id: 'b', progress_pct: 80 })
    const c = goal({ id: 'c', progress_pct: 50 })
    expect(pickTopGoal(listResponse([a, b, c]))?.id).toBe('b')
  })

  it('tiebreaks equal progress by oldest created_at', () => {
    const newer = goal({ id: 'newer', progress_pct: 50, created_at: '2026-07-10T00:00:00' })
    const older = goal({ id: 'older', progress_pct: 50, created_at: '2026-07-01T00:00:00' })
    expect(pickTopGoal(listResponse([newer, older]))?.id).toBe('older')
  })

  it('ignores completed goals even at 100%', () => {
    const done = goal({ id: 'done', status: 'completed', progress_pct: 100 })
    const active = goal({ id: 'active', progress_pct: 10 })
    expect(pickTopGoal(listResponse([done, active]))?.id).toBe('active')
  })
})

describe('formatGoalDollars', () => {
  it('renders points as $ via points_per_dollar', () => {
    expect(formatGoalDollars(500, 100)).toBe('$5.00')
    expect(formatGoalDollars(250, 50)).toBe('$5.00')
  })

  it('falls back to 100 pts/$ on a zero rate (never divides by zero)', () => {
    expect(formatGoalDollars(500, 0)).toBe('$5.00')
  })
})

describe('piggy-bank icon alias (v0.16.0)', () => {
  it('renders as Twemoji artwork, not the HelpCircle fallback', () => {
    const { container } = render(<DynamicIcon icon="piggy-bank" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    // Twemoji artwork uses the 36x36 viewBox; lucide HelpCircle uses 0 0 24 24
    expect(svg?.getAttribute('viewBox')).toBe('0 0 36 36')
  })
})
