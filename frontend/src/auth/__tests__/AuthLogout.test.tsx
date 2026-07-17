/**
 * v0.15.0: logout() must best-effort revoke THIS device's refresh token
 * server-side (POST /auth/logout with the refresh token) before clearing
 * local storage. Pre-v0.15.0 the frontend never called the endpoint, so a
 * "logged-out" device's refresh token stayed valid for its full 14 days.
 */
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { api } from '../../api/client'
import { AuthProvider, useAuth } from '../AuthContext'

vi.mock('../../api/client', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../api/client')>()
  return {
    ...mod,
    api: {
      ...mod.api,
      get: vi.fn(),
      post: vi.fn(),
      interceptors: {
        request: { use: vi.fn(() => 1), eject: vi.fn() },
        response: { use: vi.fn(() => 2), eject: vi.fn() },
      },
    },
  }
})

function LogoutProbe() {
  const { logout, isAuthenticated, isLoading } = useAuth()
  return (
    <div>
      <span data-testid="probe-state">
        {isLoading ? 'loading' : isAuthenticated ? 'in' : 'out'}
      </span>
      <button data-testid="probe-logout" onClick={logout}>
        logout
      </button>
    </div>
  )
}

const ME_RESPONSE = {
  data: {
    user: { id: 'u1', email: 'p@example.com', display_name: 'P', avatar_url: null, oauth_provider: null, is_active: true, created_at: '2026-01-01T00:00:00Z' },
    parent: null,
    kids: [],
    role: 'parent',
    kid_id: null,
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  // Mount-time checkAuth: /auth/me succeeds with the stored access token, so
  // the provider settles authenticated WITHOUT consuming the refresh token.
  vi.mocked(api.get).mockResolvedValue(ME_RESPONSE)
  vi.mocked(api.post).mockResolvedValue({ data: { message: 'ok' } })
})

async function renderSettled() {
  render(
    <AuthProvider>
      <LogoutProbe />
    </AuthProvider>
  )
  await waitFor(() => expect(screen.getByTestId('probe-state')).not.toHaveTextContent('loading'))
}

describe('logout server-side revocation (v0.15.0)', () => {
  it('POSTs the stored refresh token to /auth/logout and clears storage', async () => {
    localStorage.setItem('kc_access_token', 'stored-access')
    localStorage.setItem('kc_refresh_token', 'stored-refresh')

    await renderSettled()

    await act(async () => {
      await userEvent.click(screen.getByTestId('probe-logout'))
    })

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/logout', {
        refresh_token: 'stored-refresh',
      })
    })
    expect(localStorage.getItem('kc_access_token')).toBeNull()
    expect(localStorage.getItem('kc_refresh_token')).toBeNull()
  })

  it('still clears local storage when the revocation call fails (offline)', async () => {
    localStorage.setItem('kc_access_token', 'stored-access')
    localStorage.setItem('kc_refresh_token', 'stored-refresh')
    vi.mocked(api.post).mockRejectedValue(new Error('network down'))

    await renderSettled()

    await act(async () => {
      await userEvent.click(screen.getByTestId('probe-logout'))
    })

    expect(localStorage.getItem('kc_access_token')).toBeNull()
    expect(localStorage.getItem('kc_refresh_token')).toBeNull()
  })

  it('skips the endpoint when no refresh token is stored', async () => {
    await renderSettled()

    await act(async () => {
      await userEvent.click(screen.getByTestId('probe-logout'))
    })

    expect(api.post).not.toHaveBeenCalledWith('/auth/logout', expect.anything())
  })
})
