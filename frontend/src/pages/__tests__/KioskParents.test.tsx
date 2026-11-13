/**
 * Kiosk v0.19.0: grown-ups on the board (done instantly, no points) and parent
 * approval behind a PIN.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '../../theme'
import type { KioskState } from '../../kiosk/kioskClient'

// vi.mock is hoisted above imports, so the mock object must be hoisted with it.
const api = vi.hoisted(() => ({
  state: vi.fn(),
  claim: vi.fn(),
  endSession: vi.fn(),
  pair: vi.fn(),
  adultDone: vi.fn(),
  unlock: vi.fn(),
  pending: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
}))

vi.mock('../../kiosk/kioskClient', async (orig) => {
  const actual = await orig<typeof import('../../kiosk/kioskClient')>()
  return { ...actual, kioskApi: api }
})

import { Kiosk } from '../Kiosk'
import { KIOSK_TOKEN_KEY } from '../../kiosk/kioskClient'

function chore(id: string, name: string, assigned: string[], status = 'pending') {
  return {
    id, name, icon: 'broom', default_points: 10, assigned_kids: assigned, shared_chore: false,
    recurring_frequency: 'daily', allow_multiple_claims_per_day: false, status,
    streak_count: 0, is_recurring: true,
  }
}

function state(pinSet: boolean): KioskState {
  return {
    device_name: 'Kitchen tablet',
    kids: [{ id: 'k1', name: 'Ava', points: 120, chores: [chore('c1', 'Feed the cat', ['k1'], 'claimed')] }],
    adults: [{ id: 'p1', name: 'Dad', chores: [chore('c9', 'Take out trash', ['p1'])] }],
    parent_pin_set: pinSet,
  }
}

function renderKiosk() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <MemoryRouter>
          <Kiosk />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  )
}

const axiosErr = (status: number) => Object.assign(new Error(String(status)), { isAxiosError: true, response: { status } })

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset())
  api.state.mockResolvedValue(state(true))
  localStorage.setItem(KIOSK_TOKEN_KEY, 'kc_test')
})

afterEach(() => localStorage.clear())

describe('Kiosk grown-ups (0.19.0)', () => {
  it('lists grown-ups separately; their chores show no points and are marked done directly', async () => {
    api.adultDone.mockResolvedValue({ message: 'Done' })
    renderKiosk()
    expect(await screen.findByText('Grown-ups')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('kiosk-adult-p1'))
    expect(screen.getByText('Dad’s chores')).toBeInTheDocument()
    const tile = screen.getByTestId('kiosk-chore-c9')
    expect(tile).toHaveTextContent('Mark done')
    expect(tile).not.toHaveTextContent('points')
    fireEvent.click(tile)
    await waitFor(() => expect(api.adultDone).toHaveBeenCalledWith('p1', 'c9'))
    expect(api.claim).not.toHaveBeenCalled()
    expect(await screen.findByTestId('kiosk-celebration')).toHaveTextContent('Thanks, Dad!')
  })
})

describe('Kiosk parent approval (0.19.0)', () => {
  const typePin = (pin: string) => {
    for (const d of pin) fireEvent.click(screen.getByTestId(`kiosk-pin-${d}`))
    fireEvent.click(screen.getByTestId('kiosk-pin-ok'))
  }

  it('says how to set a PIN when no parent has one', async () => {
    api.state.mockResolvedValue(state(false))
    renderKiosk()
    fireEvent.click(await screen.findByTestId('kiosk-parent-btn'))
    expect(screen.getByTestId('kiosk-parent-no-pin')).toBeInTheDocument()
    expect(screen.queryByTestId('kiosk-pin-1')).not.toBeInTheDocument()
  })

  it('a correct PIN shows waiting claims; Approve sends the ticket, kid and chore', async () => {
    api.unlock.mockResolvedValue({ ticket: 'tkt', parent_name: 'Mom', expires_in: 120 })
    api.pending.mockResolvedValueOnce([
      { chore_id: 'c1', kid_id: 'k1', kid_name: 'Ava', chore_name: 'Feed the cat', points: 10, claimed_at: '2026-11-12T20:00:00Z' },
    ]).mockResolvedValue([])
    api.approve.mockResolvedValue({})
    renderKiosk()
    fireEvent.click(await screen.findByTestId('kiosk-parent-btn'))
    expect(screen.getByTestId('kiosk-pin-ok')).toBeDisabled() // fewer than 4 digits
    typePin('4821')
    await waitFor(() => expect(api.unlock).toHaveBeenCalledWith('4821'))
    expect(await screen.findByText('Hi, Mom')).toBeInTheDocument()
    expect(api.pending).toHaveBeenCalledWith('tkt')
    fireEvent.click(await screen.findByTestId('kiosk-approve-k1-c1'))
    await waitFor(() => expect(api.approve).toHaveBeenCalledWith('tkt', 'k1', 'c1'))
    expect(await screen.findByTestId('kiosk-parent-empty')).toBeInTheDocument()
  })

  it('a wrong PIN shows an error and unlocks nothing', async () => {
    api.unlock.mockRejectedValue(axiosErr(401))
    renderKiosk()
    fireEvent.click(await screen.findByTestId('kiosk-parent-btn'))
    typePin('0000')
    expect(await screen.findByRole('alert')).toHaveTextContent('didn’t match')
    expect(api.pending).not.toHaveBeenCalled()
  })

  it('an expired ticket sends the parent back to the PIN pad', async () => {
    api.unlock.mockResolvedValue({ ticket: 'old', parent_name: 'Mom', expires_in: 120 })
    api.pending.mockRejectedValue(axiosErr(401))
    renderKiosk()
    fireEvent.click(await screen.findByTestId('kiosk-parent-btn'))
    typePin('4821')
    await waitFor(() => expect(api.pending).toHaveBeenCalled())
    expect(await screen.findByTestId('kiosk-pin-ok')).toBeInTheDocument()
  })
})
