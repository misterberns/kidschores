/**
 * FeedbackSection (v0.17.0): parent-side report review — new-only default,
 * mark-reviewed action.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../../test/test-utils'
import { FeedbackSection } from '../FeedbackSection'
import { feedbackApi } from '../../../api/client'
import type { FeedbackItem } from '../../../api/client'

vi.mock('../../../api/client', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../../api/client')>()
  return {
    ...mod,
    feedbackApi: { ...mod.feedbackApi, list: vi.fn(), markReviewed: vi.fn() },
  }
})

const REPORT: FeedbackItem = {
  id: 'f1',
  reporter_name: 'Ava',
  role: 'kid',
  message: 'Nothing happens on Clean Room',
  app_version: '0.17.0',
  page_path: '/chores',
  status: 'new',
  reviewed_by: null,
  reviewed_at: null,
  created_at: '2026-07-27T12:00:00',
}

beforeEach(() => {
  vi.mocked(feedbackApi.list).mockReset()
  vi.mocked(feedbackApi.markReviewed).mockReset()
})

describe('FeedbackSection (v0.17.0)', () => {
  it('lists new reports with reporter, role and context line', async () => {
    vi.mocked(feedbackApi.list).mockResolvedValue({ data: [REPORT] } as never)
    render(<FeedbackSection />)
    await waitFor(() => expect(screen.getByTestId('feedback-f1')).toBeInTheDocument())
    expect(screen.getByText('Ava')).toBeInTheDocument()
    expect(screen.getByText('kid')).toBeInTheDocument()
    expect(screen.getByText('Nothing happens on Clean Room')).toBeInTheDocument()
    expect(screen.getByText(/v0\.17\.0/)).toBeInTheDocument()
  })

  it('hides reviewed reports by default', async () => {
    vi.mocked(feedbackApi.list).mockResolvedValue({
      data: [{ ...REPORT, id: 'f2', status: 'reviewed', reviewed_by: 'Parent One' }],
    } as never)
    render(<FeedbackSection />)
    await waitFor(() => expect(feedbackApi.list).toHaveBeenCalled())
    expect(screen.queryByTestId('feedback-f2')).not.toBeInTheDocument()

    await userEvent.click(screen.getByTestId('show-reviewed-toggle'))
    expect(screen.getByTestId('feedback-f2')).toBeInTheDocument()
  })

  it('marks a report reviewed', async () => {
    vi.mocked(feedbackApi.list).mockResolvedValue({ data: [REPORT] } as never)
    vi.mocked(feedbackApi.markReviewed).mockResolvedValue({
      data: { ...REPORT, status: 'reviewed' },
    } as never)
    render(<FeedbackSection />)
    await waitFor(() => expect(screen.getByTestId('mark-reviewed-btn-f1')).toBeInTheDocument())

    await userEvent.click(screen.getByTestId('mark-reviewed-btn-f1'))
    await waitFor(() => expect(feedbackApi.markReviewed).toHaveBeenCalledWith('f1'))
  })
})
