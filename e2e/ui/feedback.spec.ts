import { test, expect } from '@playwright/test';
import { ApiHelpers } from '../fixtures/api-helpers';
import { getAuthApiContext, authenticatePage } from '../fixtures/cached-auth';
import { createKidSession, authenticatePageAsKid, KidSession } from '../fixtures/kid-auth';

/**
 * Problem reports (v0.17.0) — a KID submits from the Home footer (zero 403s
 * along the way), the report lands on the parent's Reports tab with the
 * auto-attached context, and mark-reviewed hides it from the default view.
 */

const RUN = Date.now().toString(36);
const KID_NAME = `FB-Kid-${RUN}`;
const REPORT_TEXT = `Nothing happens when I tap Claim ${RUN}`;

let session: KidSession;

test.describe('Problem reports', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ playwright }) => {
    const ctx = await getAuthApiContext(playwright);
    const api = new ApiHelpers(ctx);
    const kid = await api.createKid({ name: KID_NAME });
    await ctx.dispose();
    session = await createKidSession(playwright, kid.id);
  });

  test('kid submits a report from the Home footer with zero 403s', async ({ page }) => {
    const forbidden: string[] = [];
    page.on('response', (resp) => {
      if (resp.status() === 403) forbidden.push(resp.url());
    });

    await authenticatePageAsKid(page, session);

    await page.getByTestId('report-problem-button').click();
    await expect(page.getByTestId('report-problem-modal')).toBeVisible();
    await page.getByTestId('report-problem-input').fill(REPORT_TEXT);
    await page.getByTestId('report-problem-submit').click();

    await expect(page.getByTestId('report-problem-modal')).toHaveCount(0, { timeout: 10000 });
    expect(forbidden, `403s during kid feedback flow:\n${forbidden.join('\n')}`).toHaveLength(0);
  });

  test('parent sees the report on the Reports tab and marks it reviewed', async ({ page, playwright }) => {
    await authenticatePage(page, playwright);

    await page.getByTestId('nav-admin').click();
    await page.getByTestId('tab-feedback').click();

    const card = page.locator('[data-testid^="feedback-"]', { hasText: REPORT_TEXT });
    await expect(card).toBeVisible({ timeout: 10000 });
    await expect(card.getByText(KID_NAME)).toBeVisible();
    await expect(card.getByText('kid')).toBeVisible();

    await card.locator('[data-testid^="mark-reviewed-btn-"]').click();
    await expect(card).toHaveCount(0, { timeout: 10000 });
  });
});
