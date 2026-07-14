import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InstallAppBanner } from '../InstallAppBanner'
import { resetInstallPromptStoreForTests } from '../../installPromptStore'

function fireBeforeInstallPrompt() {
  const evt = new Event('beforeinstallprompt') as Event & {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
  }
  evt.prompt = vi.fn().mockResolvedValue(undefined)
  evt.userChoice = Promise.resolve({ outcome: 'accepted' as const })
  window.dispatchEvent(evt)
  return evt
}

beforeEach(() => {
  resetInstallPromptStoreForTests()
  localStorage.clear()
})

describe('InstallAppBanner (Home, v0.14.2)', () => {
  it('renders the generic menu guidance when no prompt is available', () => {
    render(<InstallAppBanner />)
    expect(screen.getByTestId('install-app-banner')).toBeInTheDocument()
    expect(screen.getByText(/Install app/)).toBeInTheDocument()
    expect(screen.queryByTestId('install-banner-button')).not.toBeInTheDocument()
  })

  it('renders the native Install button when the prompt was captured — even pre-mount', async () => {
    const evt = fireBeforeInstallPrompt() // fires BEFORE the banner mounts
    render(<InstallAppBanner />)
    const btn = screen.getByTestId('install-banner-button')
    await act(async () => {
      await userEvent.click(btn)
    })
    expect(evt.prompt).toHaveBeenCalledOnce()
  })

  it('dismiss hides it and persists per-device', async () => {
    const { unmount } = render(<InstallAppBanner />)
    await act(async () => {
      await userEvent.click(screen.getByTestId('install-banner-dismiss'))
    })
    expect(screen.queryByTestId('install-app-banner')).not.toBeInTheDocument()
    unmount()
    // fresh mount (e.g. next visit) — still dismissed within the 14-day window
    render(<InstallAppBanner />)
    expect(screen.queryByTestId('install-app-banner')).not.toBeInTheDocument()
  })

  it('re-surfaces after the 14-day dismissal window', () => {
    const fifteenDaysAgo = Date.now() - 15 * 24 * 60 * 60 * 1000
    localStorage.setItem('kidschores-install-banner-dismissed-at', String(fifteenDaysAgo))
    render(<InstallAppBanner />)
    expect(screen.getByTestId('install-app-banner')).toBeInTheDocument()
  })
})
