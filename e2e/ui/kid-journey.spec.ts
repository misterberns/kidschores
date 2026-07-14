import { test, expect } from '@playwright/test';
import { ApiHelpers } from '../fixtures/api-helpers';
import { getAuthApiContext } from '../fixtures/cached-auth';
import { createKidSession, authenticatePageAsKid, KidSession } from '../fixtures/kid-auth';

/**
 * Kid-session journey (v0.14.1) — the regression suite for the tablet 403 storm.
 *
 * First real-world kid-role usage (2026-07-12) surfaced that the UI rendered
 * ALL kids to kid sessions while require_kid_access 403'd every sibling
 * request: Home fanned out the sibling's streak/progress queries on refetch
 * intervals, Allowance/History defaulted to kids[0], and the claim picker
 * offered the sibling — an endless "Access denied" toast storm.
 *
 * Contract asserted here: a kid session sees ONLY its own kid, and a full
 * navigation sweep produces ZERO 403 responses.
 */

const RUN = Date.now().toString(36);
const OWN_NAME = `KJ-Own-${RUN}`;
const SIBLING_NAME = `KJ-Sib-${RUN}`;
const CHORE_NAME = `KJ-Chore-${RUN}`;

let session: KidSession;
let choreId: string;

test.describe('Kid session journey', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ playwright }) => {
    const parentCtx = await getAuthApiContext(playwright);
    const api = new ApiHelpers(parentCtx);
    const own = await api.createKid({ name: OWN_NAME });
    await api.createKid({ name: SIBLING_NAME });
    const chore = await api.createChore({
      name: CHORE_NAME,
      icon: 'brush',
      default_points: 5,
      assigned_kids: [own.id],
      recurring_frequency: 'daily',
    });
    choreId = chore.id;
    await parentCtx.dispose();
    session = await createKidSession(playwright, own.id);
  });

  function collect403s(page: import('@playwright/test').Page): string[] {
    const forbidden: string[] = [];
    page.on('response', (resp) => {
      if (resp.status() === 403) forbidden.push(`${resp.status()} ${resp.url()}`);
    });
    return forbidden;
  }

  test('home shows ONLY the kid\'s own card — sibling absent', async ({ page }) => {
    const forbidden = collect403s(page);
    await authenticatePageAsKid(page, session);

    await expect(page.getByText(OWN_NAME).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(SIBLING_NAME)).toHaveCount(0);
    expect(forbidden, `403s during kid home load:\n${forbidden.join('\n')}`).toHaveLength(0);
  });

  test('full navigation sweep produces zero 403s and no Access-denied toast', async ({ page }) => {
    const forbidden = collect403s(page);
    await authenticatePageAsKid(page, session);

    for (const tab of ['Chores', 'Rewards', 'Allowance', 'History', 'Home']) {
      await page.getByRole('link', { name: tab, exact: true }).first().click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Access denied')).toHaveCount(0);
    }

    // /select-kid must bounce a kid session straight back (no picker, no loop)
    await page.goto(`${process.env.FRONTEND_URL || 'http://localhost:3103'}/select-kid`);
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toContain('/select-kid');

    expect(forbidden, `403s during kid nav sweep:\n${forbidden.join('\n')}`).toHaveLength(0);
  });

  test('install banner is discoverable on the kid Home and dismiss persists (v0.14.2)', async ({ page }) => {
    const forbidden = collect403s(page);
    await authenticatePageAsKid(page, session);

    // Headless chromium never fires beforeinstallprompt, so the banner renders
    // its guidance state — presence is the discoverability contract.
    const banner = page.getByTestId('install-app-banner');
    await expect(banner).toBeVisible({ timeout: 10000 });

    await page.getByTestId('install-banner-dismiss').click();
    await expect(banner).toBeHidden();

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('install-app-banner')).toHaveCount(0);

    expect(forbidden, `403s during banner test:\n${forbidden.join('\n')}`).toHaveLength(0);
  });

  test('kid claims their own chore directly — no picker, no 403', async ({ page }) => {
    const forbidden = collect403s(page);
    await authenticatePageAsKid(page, session);

    await page.getByRole('link', { name: 'Chores', exact: true }).first().click();
    await page.waitForLoadState('networkidle');

    const claimBtn = page.getByTestId(`claim-btn-${choreId}`);
    await expect(claimBtn).toBeVisible({ timeout: 15000 });
    await claimBtn.click();

    // Kid sessions claim as themselves immediately — the "Who's claiming?"
    // picker (which used to offer the sibling) must NOT appear.
    await expect(page.getByText("Who's claiming?")).toHaveCount(0);
    await expect(claimBtn).toBeHidden({ timeout: 15000 });

    expect(forbidden, `403s during kid claim:\n${forbidden.join('\n')}`).toHaveLength(0);
  });
});
