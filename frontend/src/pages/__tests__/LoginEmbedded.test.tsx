/**
 * v0.19.1: inside another site's frame (e.g. a Home Assistant dashboard) Google
 * sign-in can't run, so the sign-in page hides it and leads with kiosk pairing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '../../theme'

const embedded = vi.hoisted(() => ({ value: false }))
vi.mock('../../utils/embedded', () => ({ isEmbedded: () => embedded.value }))
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ login: vi.fn() }) }))

import { Login } from '../Login'

function renderLogin() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    </ThemeProvider>,
  )
}

beforeEach(() => {
  embedded.value = false
})

describe('Login inside another app (0.19.1)', () => {
  it('normally offers Google and the small pairing link, no embedded card', () => {
    renderLogin()
    expect(screen.getByText('Continue with Google')).toBeInTheDocument()
    expect(screen.getByTestId('kiosk-pair-link')).toBeInTheDocument()
    expect(screen.queryByTestId('embedded-pair-card')).not.toBeInTheDocument()
    expect(screen.queryByTestId('google-unavailable')).not.toBeInTheDocument()
  })

  it('embedded: hides Google, explains why, and leads with pairing to /kiosk', () => {
    embedded.value = true
    renderLogin()
    expect(screen.queryByText('Continue with Google')).not.toBeInTheDocument()
    expect(screen.getByTestId('google-unavailable')).toHaveTextContent('doesn’t work inside another app')
    expect(screen.getByTestId('kiosk-pair-primary')).toHaveAttribute('href', '/kiosk')
    // Exactly one pairing entry point, and email/password still works.
    expect(screen.queryByTestId('kiosk-pair-link')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })
})

describe('isEmbedded', () => {
  it('is false for a top-level page and true when window.top differs or throws', async () => {
    const { isEmbedded } = await vi.importActual<typeof import('../../utils/embedded')>('../../utils/embedded')
    expect(isEmbedded()).toBe(false)
    const spy = vi.spyOn(window, 'top', 'get')
    spy.mockReturnValue({} as Window)
    expect(isEmbedded()).toBe(true)
    spy.mockImplementation(() => { throw new Error('cross-origin') })
    expect(isEmbedded()).toBe(true)
    spy.mockRestore()
  })
})
