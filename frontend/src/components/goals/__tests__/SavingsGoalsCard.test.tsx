/**
 * SavingsGoalsCard (v0.16.0): cap state hides "Add goal", reached state shows
 * the one-tap payout CTA, parent-only Boost affordance.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { render } from '../../../test/test-utils'
import { SavingsGoalsCard } from '../SavingsGoalsCard'
import { goalsApi } from '../../../api/client'
import type { GoalsListResponse, SavingsGoal } from '../../../api/client'

vi.mock('../../../api/client', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../../api/client')>()
  return {
    ...mod,
    goalsApi: { ...mod.goalsApi, list: vi.fn() },
  }
})

function goal(overrides: Partial<SavingsGoal>): SavingsGoal {
  return {
    id: `g-${Math.random().toString(36).slice(2, 8)}`,
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

function mockList(goals: SavingsGoal[], currentPoints = 0) {
  const data: GoalsListResponse = {
    kid_id: 'k1',
    current_points: currentPoints,
    points_per_dollar: 100,
    goals,
  }
  vi.mocked(goalsApi.list).mockResolvedValue({ data } as never)
}

beforeEach(() => {
  vi.mocked(goalsApi.list).mockReset()
})

describe('SavingsGoalsCard (v0.16.0)', () => {
  it('shows the empty state and an Add goal button', async () => {
    mockList([])
    render(<SavingsGoalsCard kidId="k1" isParent={false} />)
    await waitFor(() => expect(screen.getByTestId('savings-goals-card')).toBeInTheDocument())
    expect(screen.getByText(/No savings goals yet/)).toBeInTheDocument()
    expect(screen.getByTestId('add-goal-button')).toBeInTheDocument()
  })

  it('hides Add goal at the 3-active cap and shows the hint', async () => {
    mockList([goal({ id: 'a' }), goal({ id: 'b' }), goal({ id: 'c' })])
    render(<SavingsGoalsCard kidId="k1" isParent={false} />)
    await waitFor(() => expect(screen.getByTestId('savings-goals-card')).toBeInTheDocument())
    expect(screen.queryByTestId('add-goal-button')).not.toBeInTheDocument()
    expect(screen.getByText(/Max 3 goals at a time/)).toBeInTheDocument()
  })

  it('shows the one-tap payout CTA only when a goal is reached', async () => {
    mockList(
      [
        goal({ id: 'reached', name: 'Bike', target_points: 500, progress_pct: 100, reached: true }),
        goal({ id: 'not-yet', name: 'Game', target_points: 900, progress_pct: 55.6, reached: false }),
      ],
      500,
    )
    render(<SavingsGoalsCard kidId="k1" isParent={false} />)
    await waitFor(() => expect(screen.getByTestId('convert-goal-reached')).toBeInTheDocument())
    expect(screen.getByTestId('convert-goal-reached')).toHaveTextContent('request $5.00 payout')
    expect(screen.queryByTestId('convert-goal-not-yet')).not.toBeInTheDocument()
  })

  it('shows the Boost affordance for parents only', async () => {
    mockList([goal({ id: 'a', name: 'Bike' })])
    const { unmount } = render(<SavingsGoalsCard kidId="k1" isParent={true} />)
    await waitFor(() => expect(screen.getByLabelText('Boost points toward Bike')).toBeInTheDocument())
    unmount()

    mockList([goal({ id: 'a', name: 'Bike' })])
    render(<SavingsGoalsCard kidId="k1" isParent={false} />)
    await waitFor(() => expect(screen.getByTestId('savings-goals-card')).toBeInTheDocument())
    expect(screen.queryByLabelText('Boost points toward Bike')).not.toBeInTheDocument()
  })

  it('lists completed goals collapsed under a toggle', async () => {
    mockList([
      goal({ id: 'done', name: 'Old Goal', status: 'completed', completed_at: '2026-07-10T00:00:00' }),
    ])
    render(<SavingsGoalsCard kidId="k1" isParent={false} />)
    await waitFor(() => expect(screen.getByText('Completed (1)')).toBeInTheDocument())
    // Collapsed by default
    expect(screen.queryByText('Old Goal')).not.toBeInTheDocument()
  })
})
