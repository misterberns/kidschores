/**
 * lazyWithRetry (v0.15.1): stale-chunk recovery must reload ONCE, then
 * re-throw to the ErrorBoundary — never reload-loop on a genuinely-missing
 * chunk (the Card Atlas audit ERR-1 cap, ported).
 */
import { Suspense } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { lazyWithRetry } from '../lazyWithRetry'

const reloadSpy = vi.fn()

beforeEach(() => {
  sessionStorage.clear()
  reloadSpy.mockClear()
  // jsdom's location.reload is not configurable via vi.spyOn — replace it.
  Object.defineProperty(window, 'location', {
    value: { ...window.location, reload: reloadSpy },
    writable: true,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('lazyWithRetry (v0.15.1)', () => {
  it('renders the component when the chunk loads', async () => {
    const Ok = lazyWithRetry(() =>
      Promise.resolve({ default: () => <div data-testid="loaded">ok</div> })
    )
    render(
      <Suspense fallback={<div>loading</div>}>
        <Ok />
      </Suspense>
    )
    await waitFor(() => expect(screen.getByTestId('loaded')).toBeInTheDocument())
    expect(reloadSpy).not.toHaveBeenCalled()
  })

  it('reloads ONCE on a failed chunk, marking sessionStorage', async () => {
    const factory = () => Promise.reject(new Error('stale chunk')) as Promise<{ default: React.ComponentType<unknown> }>
    const Broken = lazyWithRetry(factory)
    render(
      <Suspense fallback={<div>loading</div>}>
        <Broken />
      </Suspense>
    )
    await waitFor(() => expect(reloadSpy).toHaveBeenCalledTimes(1))
    const key = `kc:chunk-retry:${factory.toString()}`
    expect(sessionStorage.getItem(key)).toBe('1')
  })

  it('does NOT reload again after the marker is set (re-throws instead)', async () => {
    const factory = () => Promise.reject(new Error('still missing')) as Promise<{ default: React.ComponentType<unknown> }>
    sessionStorage.setItem(`kc:chunk-retry:${factory.toString()}`, '1')

    // The lazy factory re-throws -> Suspense surfaces the error to the nearest
    // error boundary. Assert directly on the wrapped factory's rejection.
    const Broken = lazyWithRetry(factory)
    // Access the internal payload by rendering inside an error-catching boundary.
    class Catcher extends (await import('react')).Component<{ children: React.ReactNode }, { caught: boolean }> {
      state = { caught: false }
      static getDerivedStateFromError() {
        return { caught: true }
      }
      render() {
        return this.state.caught ? <div data-testid="boundary">boundary</div> : this.props.children
      }
    }
    render(
      <Catcher>
        <Suspense fallback={<div>loading</div>}>
          <Broken />
        </Suspense>
      </Catcher>
    )
    await waitFor(() => expect(screen.getByTestId('boundary')).toBeInTheDocument())
    expect(reloadSpy).not.toHaveBeenCalled()
  })
})
