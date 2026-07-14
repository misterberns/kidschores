import { act, renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useInstallApp, detectStandalone } from '../useInstallApp'
import { resetInstallPromptStoreForTests } from '../../installPromptStore'

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

beforeEach(() => {
  resetInstallPromptStoreForTests()
})

describe('useInstallApp (store-backed, v0.14.2)', () => {
  it('starts with no prompt available and not standalone', () => {
    const { result } = renderHook(() => useInstallApp())
    expect(result.current.canPromptInstall).toBe(false)
    expect(result.current.isStandalone).toBe(false)
  })

  it('REGRESSION: event fired BEFORE any consumer mounts is still captured', async () => {
    // The one-shot beforeinstallprompt fires early in page load — long before
    // a lazy page mounts the hook. The module-scope store (imported in the
    // entry chunk) must have stashed it. This is the exact bug that made the
    // native Install button dead-on-arrival in v0.13.0 (and Card Atlas
    // v2.1.42 before it).
    let evt!: ReturnType<typeof fireBeforeInstallPrompt>
    act(() => {
      evt = fireBeforeInstallPrompt('accepted')
    })

    const { result } = renderHook(() => useInstallApp()) // mounts AFTER the event
    expect(result.current.canPromptInstall).toBe(true)

    let accepted = false
    await act(async () => {
      accepted = await result.current.promptInstall()
    })
    expect(evt.prompt).toHaveBeenCalledOnce()
    expect(accepted).toBe(true)
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

  it('two consumers share the one stash (Help card + Home banner)', () => {
    const a = renderHook(() => useInstallApp())
    const b = renderHook(() => useInstallApp())
    act(() => {
      fireBeforeInstallPrompt()
    })
    expect(a.result.current.canPromptInstall).toBe(true)
    expect(b.result.current.canPromptInstall).toBe(true)
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
