import { test, expect } from '../fixtures/test-database';
import { test as base, expect as kidExpect } from '@playwright/test';
import { TestData } from '../fixtures/test-data';
import { ApiHelpers } from '../fixtures/api-helpers';
import { getAuthApiContext } from '../fixtures/cached-auth';
import { createKidSession, authenticatePageAsKid, KidSession } from '../fixtures/kid-auth';

/**
 * Savings goals (v0.16.0, UX-REVIEW 5b): create/edit on Allowance, the compact
 * ring on the Home kid card, the 3-active cap, parent Boost, and the
 * goal-reached celebration + one-tap payout conversion (kid session).
 */

test.describe('Savings Goals (parent)', () => {
  let kidId: string;

  test.beforeEach(async ({ authenticatedPage: page, apiContext, resetDatabase }) => {
    await resetDatabase();
    const kidResp = await apiContext.post('/api/kids', { data: TestData.kid.emma() });
    kidId = (await kidResp.json()).id;
    await page.goto('/allowance');
  });

  test('creates a goal via the inline form and shows it with live progress', async ({ authenticatedPage: page, apiContext }) => {
    await page.getByTestId('add-goal-button').click();
    await page.getByLabel('What are you saving for?').fill('New Bike');
    await page.getByLabel('Target (points)').fill('500');
    await expect(page.getByTestId('goal-form').getByText('= $5.00')).toBeVisible();
    await page.getByTestId('save-goal-button').click();

    await expect(page.getByText('New Bike')).toBeVisible();
    await expect(page.getByText('0 / 500 pts')).toBeVisible();

    // Home kid card shows the compact goal ring
    await page.goto('/');
    await expect(page.getByTestId(`goal-ring-${kidId}`)).toBeVisible();
    await expect(page.getByTestId(`goal-ring-${kidId}`).getByText('New Bike')).toBeVisible();

    // ...and the allowance $ line uses the real conversion rate
    const goalsResp = await apiContext.get(`/api/goals/${kidId}`);
    expect((await goalsResp.json()).points_per_dollar).toBe(100);
  });

  test('caps active goals at 3 — Add goal hides and the hint shows', async ({ authenticatedPage: page, apiContext }) => {
    for (const name of ['Goal A', 'Goal B', 'Goal C']) {
      const resp = await apiContext.post(`/api/goals/${kidId}`, {
        data: { name, target_points: 500 },
      });
      expect(resp.ok()).toBeTruthy();
    }
    // A 4th is rejected server-side
    const fourth = await apiContext.post(`/api/goals/${kidId}`, {
      data: { name: 'Goal D', target_points: 500 },
    });
    expect(fourth.status()).toBe(400);

    await page.reload();
    await expect(page.getByText('Goal C')).toBeVisible();
    await expect(page.getByTestId('add-goal-button')).toHaveCount(0);
    await expect(page.getByText(/Max 3 goals at a time/)).toBeVisible();
  });

  test('parent Boost adds points toward a goal', async ({ authenticatedPage: page, apiContext }) => {
    await apiContext.post(`/api/goals/${kidId}`, { data: { name: 'Boost Me', target_points: 400 } });
    await page.reload();

    await page.getByLabel('Boost points toward Boost Me').click();
    await page.getByLabel('Bonus points toward Boost Me').fill('150');
    await page.getByRole('button', { name: 'Boost', exact: true }).click();

    await expect(page.getByText('150 / 400 pts')).toBeVisible();
  });

  test('reached goal offers the one-tap payout; converting creates a pending payout and completes the goal', async ({ authenticatedPage: page, apiContext }) => {
    const goalResp = await apiContext.post(`/api/goals/${kidId}`, {
      data: { name: 'Skateboard', target_points: 300 },
    });
    const goalId = (await goalResp.json()).id;
    await apiContext.post(`/api/kids/${kidId}/points`, { data: { points: 300 } });
    await page.reload();

    const cta = page.getByTestId(`convert-goal-${goalId}`);
    await expect(cta).toBeVisible();
    await expect(cta).toContainText('request $3.00 payout');
    await cta.click();

    // Pending payout appears (parent view shows the approvals queue)
    await expect(page.getByText('Pending Approvals')).toBeVisible();
    await expect(page.getByText('Savings goal: Skateboard').first()).toBeVisible();

    // Goal moved to the collapsed Completed section
    await page.getByRole('button', { name: /Completed \(1\)/ }).click();
    await expect(page.getByTestId('savings-goals-card').getByText('Skateboard')).toBeVisible();
  });
});

/**
 * Kid-session celebration flow — mirrors kid-journey.spec.ts conventions
 * (uniquely-named kids, no DB reset, serial).
 */
base.describe('Savings Goals (kid session)', () => {
  base.describe.configure({ mode: 'serial' });

  const RUN = Date.now().toString(36);
  const KID_NAME = `SG-Kid-${RUN}`;

  let session: KidSession;
  let kidId: string;
  let goalId: string;

  base.beforeAll(async ({ playwright }) => {
    const parentCtx = await getAuthApiContext(playwright);
    const api = new ApiHelpers(parentCtx);
    const kid = await api.createKid({ name: KID_NAME });
    kidId = kid.id;
    const goalResp = await parentCtx.post(`/api/goals/${kidId}`, {
      data: { name: `SG-Dream-${RUN}`, target_points: 250 },
    });
    goalId = (await goalResp.json()).id;
    await api.adjustKidPoints(kidId, 250, 'e2e goal-reached setup');
    await parentCtx.dispose();
    session = await createKidSession(playwright, kidId);
  });

  base('celebration fires once on the kid device when the goal is reached', async ({ page }) => {
    await authenticatePageAsKid(page, session);

    const celebration = page.getByTestId('goal-celebration');
    await kidExpect(celebration).toBeVisible({ timeout: 10000 });
    await kidExpect(celebration).toContainText('Goal reached');
    await kidExpect(page.getByTestId('goal-celebration-convert')).toContainText('Request $2.50 payout');

    // "Keep saving" dismisses without converting
    await page.getByRole('button', { name: 'Keep saving' }).click();
    await kidExpect(celebration).toBeHidden();

    // Reload: the per-device flag prevents re-celebration; the ring still shows reached
    await page.reload();
    await page.waitForLoadState('networkidle');
    await kidExpect(page.getByTestId('goal-celebration')).toHaveCount(0);
    await kidExpect(page.getByTestId(`goal-ring-${kidId}`)).toContainText('Goal reached');
  });

  base('kid cashes in from the Allowance goals card', async ({ page }) => {
    await authenticatePageAsKid(page, session);
    await page.getByRole('link', { name: 'Allowance', exact: true }).first().click();
    await page.waitForLoadState('networkidle');

    await page.getByTestId(`convert-goal-${goalId}`).click();

    // Payout requested: pending badge on the balance card + goal completed
    await kidExpect(page.getByText(/1 pending payout/)).toBeVisible({ timeout: 10000 });
    await kidExpect(page.getByRole('button', { name: /Completed \(1\)/ })).toBeVisible();
  });
});
