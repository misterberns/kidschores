/**
 * Kiosk mode (v0.18.0): picker -> kid's chores -> claim -> celebration, idle return,
 * a revoked device, and the hold-then-confirm exit.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '../../theme'
import type { KioskState } from '../../kiosk/kioskClient'

const state = vi.fn()
const claim = vi.fn()
const endSession = vi.fn()
const pair = vi.fn()

vi.mock('../../kiosk/kioskClient', async (orig) => {
  const actual = await orig<typeof import('../../kiosk/kioskClient')>()
  return {
    ...actual,
    kioskApi: {
      state: () => state(),
      claim: (k: string, c: string) => claim(k, c),
      endSession: () => endSession(),
      pair: (c: string) => pair(c),
    },
  }
})

import { Kiosk, KIOSK_IDLE_MS, KIOSK_EXIT_HOLD_MS } from '../Kiosk'
import { KIOSK_TOKEN_KEY } from '../../kiosk/kioskClient'

function chore(id: string, name: string, status = 'pending') {
  return {
    id, name, icon: 'broom', default_points: 10, assigned_kids: ['k1'], shared_chore: false,
    recurring_frequency: 'daily', allow_multiple_claims_per_day: false, status,
    streak_count: 0, is_recurring: true,
  }
}

const STATE: KioskState = {
  device_name: 'Kitchen tablet',
  kids: [
    { id: 'k1', name: 'Ava', points: 120, chores: [chore('c1', 'Feed the cat'), chore('c2', 'Make bed', 'claimed')] },
    { id: 'k2', name: 'Ben', points: 40, chores: [] },
  ],
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

function axios401() {
  return Object.assign(new Error('401'), { isAxiosError: true, response: { status: 401 } })
}

beforeEach(() => {
  state.mockReset().mockResolvedValue(STATE)
  claim.mockReset().mockResolvedValue({ id: 'cl1', status: 'claimed' })
  endSession.mockReset().mockResolvedValue({})
  pair.mockReset()
  localStorage.setItem(KIOSK_TOKEN_KEY, 'kc_test')
})

afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
})

describe('Kiosk', () => {
  it('without a device token it says the device is not a kiosk and never calls the API', () => {
    localStorage.removeItem(KIOSK_TOKEN_KEY)
    renderKiosk()
    expect(screen.getByText('This device is not a kiosk yet')).toBeInTheDocument()
    expect(state).not.toHaveBeenCalled()
  })

  it('picks a kid, shows today’s chores, claims one and celebrates', async () => {
    renderKiosk()
    expect(await screen.findByText('Who’s doing chores?')).toBeInTheDocument()
    expect(screen.getByText('1 chore to do')).toBeInTheDocument() // Ava: one pending
    expect(screen.getByText('No chores today')).toBeInTheDocument() // Ben: none assigned

    fireEvent.click(screen.getByTestId('kiosk-kid-k1'))
    expect(screen.getByText('Ava’s chores')).toBeInTheDocument()
    expect(screen.getByText('Waiting for a parent')).toBeInTheDocument() // c2 claimed: not a button
    expect(screen.getByTestId('kiosk-chore-c2').tagName).toBe('DIV')

    fireEvent.click(screen.getByTestId('kiosk-chore-c1'))
    await waitFor(() => expect(claim).toHaveBeenCalledWith('k1', 'c1'))
    expect(await screen.findByTestId('kiosk-celebration')).toHaveTextContent('Nice work, Ava!')
  })

  it('returns to the picker after the idle timeout', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    renderKiosk()
    fireEvent.click(await screen.findByTestId('kiosk-kid-k1'))
    expect(screen.getByText('Ava’s chores')).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(KIOSK_IDLE_MS + 50) })
    expect(screen.getByText('Who’s doing chores?')).toBeInTheDocument()
  })

  it('a touch resets the idle timer', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    renderKiosk()
    fireEvent.click(await screen.findByTestId('kiosk-kid-k1'))
    act(() => { vi.advanceTimersByTime(KIOSK_IDLE_MS - 1000) })
    fireEvent.pointerDown(window)
    act(() => { vi.advanceTimersByTime(2000) })
    expect(screen.getByText('Ava’s chores')).toBeInTheDocument()
  })

  it('a revoked device shows the turned-off screen and forgets its token', async () => {
    state.mockReset().mockRejectedValue(axios401())
    renderKiosk()
    expect(await screen.findByText('This kiosk was turned off')).toBeInTheDocument()
    expect(localStorage.getItem(KIOSK_TOKEN_KEY)).toBeNull()
  })

  it('exit needs a full hold, then a confirm; "Keep kiosk" keeps it', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    renderKiosk()
    await screen.findByText('Who’s doing chores?')
    const exit = screen.getByTestId('kiosk-exit')

    fireEvent.pointerDown(exit)
    act(() => { vi.advanceTimersByTime(KIOSK_EXIT_HOLD_MS / 2) })
    fireEvent.pointerUp(exit) // let go early: nothing happens
    act(() => { vi.advanceTimersByTime(KIOSK_EXIT_HOLD_MS) })
    expect(screen.queryByTestId('kiosk-exit-confirm')).not.toBeInTheDocument()

    fireEvent.pointerDown(exit)
    act(() => { vi.advanceTimersByTime(KIOSK_EXIT_HOLD_MS + 50) })
    expect(screen.getByTestId('kiosk-exit-confirm')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Keep kiosk'))
    expect(screen.queryByTestId('kiosk-exit-confirm')).not.toBeInTheDocument()
    expect(endSession).not.toHaveBeenCalled()
    expect(localStorage.getItem(KIOSK_TOKEN_KEY)).toBe('kc_test')
  })

  it('pairs with a code: no sign-in, token stored, board shown (0.18.2)', async () => {
    localStorage.removeItem(KIOSK_TOKEN_KEY)
    pair.mockResolvedValue({ token: 'kc_paired', name: 'HA tablet' })
    renderKiosk()
    const submit = screen.getByTestId('kiosk-pair-submit')
    expect(submit).toBeDisabled() // nothing typed yet
    fireEvent.change(screen.getByTestId('kiosk-pair-code'), { target: { value: 'abcd-efgh' } })
    fireEvent.click(submit)
    await waitFor(() => expect(pair).toHaveBeenCalledWith('ABCD-EFGH'))
    expect(await screen.findByText('Who’s doing chores?')).toBeInTheDocument()
    expect(localStorage.getItem(KIOSK_TOKEN_KEY)).toBe('kc_paired')
  })

  it('a wrong pairing code shows an error and stores nothing', async () => {
    localStorage.removeItem(KIOSK_TOKEN_KEY)
    pair.mockRejectedValue(Object.assign(new Error('400'), { isAxiosError: true, response: { status: 400 } }))
    renderKiosk()
    fireEvent.change(screen.getByTestId('kiosk-pair-code'), { target: { value: 'WRNG-CODE' } })
    fireEvent.click(screen.getByTestId('kiosk-pair-submit'))
    expect(await screen.findByRole('alert')).toHaveTextContent('isn’t valid or has expired')
    expect(localStorage.getItem(KIOSK_TOKEN_KEY)).toBeNull()
  })
})
