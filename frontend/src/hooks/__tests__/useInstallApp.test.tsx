import { act, renderHook } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useInstallApp, detectStandalone } from '../useInstallApp'

function fireBeforeInstallPrompt(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const evt = new Event('beforeinstallprompt') as Event & {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
  }
  evt.prompt = vi.fn().mockResolvedValue(undefined)
  evt.userChoice = Promise.resolve({ outcome })
  window.dispatchEvent(evt)
  return evt
}

describe('useInstallApp', () => {
  it('starts with no prompt available and not standalone', () => {
    const { result } = renderHook(() => useInstallApp())
    expect(result.current.canPromptInstall).toBe(false)
    expect(result.current.isStandalone).toBe(false)
  })

  it('captures beforeinstallprompt and exposes the native prompt', async () => {
    const { result } = renderHook(() => useInstallApp())
    let evt!: ReturnType<typeof fireBeforeInstallPrompt>
    act(() => {
      evt = fireBeforeInstallPrompt('accepted')
    })
    expect(result.current.canPromptInstall).toBe(true)

    let accepted = false
    await act(async () => {
      accepted = await result.current.promptInstall()
    })
    expect(evt.prompt).toHaveBeenCalledOnce()
    expect(accepted).toBe(true)
    // the stashed event is single-use
    expect(result.current.canPromptInstall).toBe(false)
  })

  it('flips to standalone on appinstalled', () => {
    const { result } = renderHook(() => useInstallApp())
    act(() => {
      fireBeforeInstallPrompt()
    })
    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })
    expect(result.current.isStandalone).toBe(true)
    expect(result.current.canPromptInstall).toBe(false)
  })

  it('detectStandalone is false in jsdom', () => {
    expect(detectStandalone()).toBe(false)
  })
})
