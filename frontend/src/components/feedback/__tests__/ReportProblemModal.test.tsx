/**
 * ReportProblemModal (v0.17.0): kid-usable problem reports with auto-attached
 * context (app version + current page).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../../test/test-utils'
import { ReportProblemModal } from '../ReportProblemModal'
import { feedbackApi } from '../../../api/client'

vi.mock('../../../api/client', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../../api/client')>()
  return {
    ...mod,
    feedbackApi: { ...mod.feedbackApi, create: vi.fn() },
  }
})

beforeEach(() => {
  vi.mocked(feedbackApi.create).mockReset()
})

describe('ReportProblemModal (v0.17.0)', () => {
  it('disables submit until a message is typed', () => {
    render(<ReportProblemModal onClose={() => {}} />)
    expect(screen.getByTestId('report-problem-submit')).toBeDisabled()
  })

  it('submits with auto-attached app_version and page_path, then closes', async () => {
    vi.mocked(feedbackApi.create).mockResolvedValue({ data: { id: 'f1' } } as never)
    const onClose = vi.fn()
    render(<ReportProblemModal onClose={onClose} />)

    await userEvent.type(screen.getByTestId('report-problem-input'), 'Claim button broken')
    await userEvent.click(screen.getByTestId('report-problem-submit'))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(feedbackApi.create).toHaveBeenCalledWith({
      message: 'Claim button broken',
      app_version: '0.0.0-test',
      page_path: '/',
    })
  })

  it('closes on Escape without submitting', async () => {
    const onClose = vi.fn()
    render(<ReportProblemModal onClose={onClose} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
    expect(feedbackApi.create).not.toHaveBeenCalled()
  })
})
