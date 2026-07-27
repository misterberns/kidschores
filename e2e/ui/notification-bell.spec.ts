import { test, expect } from '@playwright/test';
import { ApiHelpers } from '../fixtures/api-helpers';
import { getAuthApiContext } from '../fixtures/cached-auth';
import { authenticatePage } from '../fixtures/cached-auth';

/**
 * NotificationBell (v0.17.0) — parent header bell: pending-approvals badge,
 * dropdown panel with server-enriched names, badge clears after approval
 * (validates the approvals-count invalidation wiring).
 */

const RUN = Date.now().toString(36);
const KID_NAME = `Bell-Kid-${RUN}`;
const CHORE_NAME = `Bell-Chore-${RUN}`;

let kidId: string;
let choreId: string;

test.describe('Notification bell', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ playwright }) => {
    const ctx = await getAuthApiContext(playwright);
    const api = new ApiHelpers(ctx);
    const kid = await api.createKid({ name: KID_NAME });
    kidId = kid.id;
    const chore = await api.createChore({
      name: CHORE_NAME,
      icon: 'brush',
      default_points: 5,
      assigned_kids: [kid.id],
      recurring_frequency: 'daily',
    });
    choreId = chore.id;
    await api.claimChore(choreId, kidId);
    await ctx.dispose();
  });

  test('badge shows pending count; panel lists the claim by name', async ({ page, playwright }) => {
    await authenticatePage(page, playwright);

    const badge = page.getByTestId('bell-badge');
    await expect(badge).toBeVisible({ timeout: 10000 });

    await page.getByTestId('bell-button').click();
    const panel = page.getByTestId('bell-panel');
    await expect(panel).toBeVisible();
    await expect(panel.getByText(KID_NAME)).toBeVisible();
    await expect(panel.getByText(CHORE_NAME)).toBeVisible();

    // Footer: version chip + settings link live inside the panel
    await expect(panel.getByTestId('version-chip')).toBeVisible();
    await expect(panel.getByText('Notification settings')).toBeVisible();
  });

  test('View all navigates to the Parent tab; approving clears the badge', async ({ page, playwright }) => {
    await authenticatePage(page, playwright);

    await page.getByTestId('bell-button').click();
    await page.getByTestId('bell-view-all').click();
    await expect(page).toHaveURL(/\/admin/);

    await page.getByTestId(`approve-chore-btn-${choreId}`).click();
    // The approve mutation invalidates ['approvals'] + ['approvals-count'] —
    // OUR card must disappear without waiting for the 30s poll. (Asserting the
    // badge reaches zero would race parallel suites seeding their own claims.)
    await expect(page.getByTestId(`approval-chore-${choreId}`)).toHaveCount(0, { timeout: 10000 });
  });
});
