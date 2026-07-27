/**
 * Mutation error toasts (v0.16.2): the toast lives on the MutationCache so it
 * runs for EVERY failed mutation IN ADDITION to per-mutation onError handlers.
 * The old defaultOptions.mutations.onError was silently REPLACED by any
 * per-mutation onError (TanStack v5 shallow-merge) — which is how the chore
 * claim's 400 "Chore already claimed today" became invisible.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider, useMutation } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { createQueryClient } from '../queryClient'

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

function axiosError(status: number, detail?: unknown) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data: detail === undefined ? {} : { detail } },
  })
}

function wrapperFor(client: ReturnType<typeof createQueryClient>) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

beforeEach(() => {
  vi.mocked(toast.error).mockReset()
})

describe('mutation error toasts (v0.16.2)', () => {
  it('toasts the 400 detail even when the mutation has its own onError (un-shadowable)', async () => {
    const client = createQueryClient()
    const perMutationOnError = vi.fn()
    const { result } = renderHook(
      () =>
        useMutation({
          mutationFn: () => Promise.reject(axiosError(400, 'Chore already claimed today')),
          onError: perMutationOnError,
        }),
      { wrapper: wrapperFor(client) }
    )

    result.current.mutate()
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(toast.error).toHaveBeenCalledWith('Chore already claimed today')
    expect(perMutationOnError).toHaveBeenCalledTimes(1)
  })

  it('falls back to meta.errorFallback when the response has no detail', async () => {
    const client = createQueryClient()
    const { result } = renderHook(
      () =>
        useMutation({
          mutationFn: () => Promise.reject(axiosError(400)),
          meta: { errorFallback: 'Failed to create challenge' },
        }),
      { wrapper: wrapperFor(client) }
    )

    result.current.mutate()
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(toast.error).toHaveBeenCalledWith('Failed to create challenge')
  })

  it('does not toast 403 (the axios interceptor owns that toast)', async () => {
    const client = createQueryClient()
    const { result } = renderHook(
      () =>
        useMutation({
          mutationFn: () => Promise.reject(axiosError(403, 'Access denied')),
        }),
      { wrapper: wrapperFor(client) }
    )

    result.current.mutate()
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(toast.error).not.toHaveBeenCalled()
  })

  it('meta.suppressErrorToast silences the global toast', async () => {
    const client = createQueryClient()
    const { result } = renderHook(
      () =>
        useMutation({
          mutationFn: () => Promise.reject(axiosError(400, 'noisy detail')),
          meta: { suppressErrorToast: true },
        }),
      { wrapper: wrapperFor(client) }
    )

    result.current.mutate()
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(toast.error).not.toHaveBeenCalled()
  })
})
