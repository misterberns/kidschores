/**
 * NotificationBell (v0.17.0): role-split — kid sessions get a plain settings
 * link with ZERO parent-only queries mounted (the zero-403 invariant); parents
 * get a pending-approvals badge and a dropdown panel with server-enriched names.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../../test/test-utils'
import { NotificationBell } from '../NotificationBell'
import { approvalsApi, allowanceApi } from '../../../api/client'

vi.mock('../../../api/client', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../../api/client')>()
  return {
    ...mod,
    approvalsApi: { ...mod.approvalsApi, count: vi.fn(), pending: vi.fn() },
    allowanceApi: { ...mod.allowanceApi, getAllPending: vi.fn() },
  }
})

beforeEach(() => {
  vi.mocked(approvalsApi.count).mockReset()
  vi.mocked(approvalsApi.pending).mockReset()
  vi.mocked(allowanceApi.getAllPending).mockReset()
})

function mockCounts(total: number) {
  vi.mocked(approvalsApi.count).mockResolvedValue({
    data: { chores: total, rewards: 0, total },
  } as never)
  vi.mocked(approvalsApi.pending).mockResolvedValue({
    data: {
      chores: total > 0 ? [{
        id: 'cl1', kid_id: 'k1', chore_id: 'c1', status: 'claimed',
        points_awarded: null, claimed_at: '2026-07-27T12:00:00', approved_at: null,
        approved_by: null, kid_name: 'Ava', chore_name: 'Clean Room',
      }] : [],
      rewards: [],
    },
  } as never)
  vi.mocked(allowanceApi.getAllPending).mockResolvedValue({ data: [] } as never)
}

describe('NotificationBell (v0.17.0)', () => {
  it('kid role renders a plain settings link and fetches NOTHING', () => {
    render(<NotificationBell role="kid" />)
    expect(screen.getByLabelText('Notification settings')).toBeInTheDocument()
    expect(screen.queryByTestId('bell-button')).not.toBeInTheDocument()
    expect(approvalsApi.count).not.toHaveBeenCalled()
    expect(approvalsApi.pending).not.toHaveBeenCalled()
  })

  it('parent role shows the count badge when approvals are pending', async () => {
    mockCounts(3)
    render(<NotificationBell role="parent" />)
    await waitFor(() => expect(screen.getByTestId('bell-badge')).toBeInTheDocument())
    expect(screen.getByTestId('bell-badge')).toHaveTextContent('3')
  })

  it('parent role hides the badge at zero pending', async () => {
    mockCounts(0)
    render(<NotificationBell role="parent" />)
    await waitFor(() => expect(approvalsApi.count).toHaveBeenCalled())
    expect(screen.queryByTestId('bell-badge')).not.toBeInTheDocument()
  })

  it('opening the panel lists pending claims by name with a footer', async () => {
    mockCounts(1)
    render(<NotificationBell role="parent" />)
    await waitFor(() => expect(screen.getByTestId('bell-badge')).toBeInTheDocument())

    await userEvent.click(screen.getByTestId('bell-button'))
    await waitFor(() => expect(screen.getByTestId('bell-panel')).toBeInTheDocument())

    expect(screen.getByText('Ava')).toBeInTheDocument()
    expect(screen.getByText('Clean Room')).toBeInTheDocument()
    expect(screen.getByTestId('bell-view-all')).toBeInTheDocument()
    expect(screen.getByTestId('version-chip')).toBeInTheDocument()
    expect(screen.getByText('Notification settings')).toBeInTheDocument()
  })
})
