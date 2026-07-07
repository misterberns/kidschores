import { test, expect } from '../fixtures/test-database';
import { TestData } from '../fixtures/test-data';

test.describe('Allowance Page', () => {
  let kidId: string;

  test.beforeEach(async ({ authenticatedPage: page, apiContext, resetDatabase }) => {
    await resetDatabase();

    // Create a test kid with points
    const kidResp = await apiContext.post('/api/kids', { data: TestData.kid.emma() });
    const kid = await kidResp.json();
    kidId = kid.id;

    // Add points
    await apiContext.post(`/api/kids/${kidId}/points`, { data: { points: 500 } });

    // Navigate to allowance page
    await page.goto('/allowance');
  });

  test('should display allowance page', async ({ authenticatedPage: page }) => {
    await expect(page.getByText('Allowance')).toBeVisible();
  });

  test('should show kid selector when there are multiple kids', async ({ authenticatedPage: page, apiContext }) => {
    // The kid selector (a "Select kid" tablist) only renders with 2+ kids;
    // with a single kid that kid is auto-selected and no selector is shown.
    await apiContext.post('/api/kids', { data: TestData.kid.jack() });
    await page.reload();

    await expect(page.getByRole('tablist', { name: /select kid/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Emma' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Jack' })).toBeVisible();
  });

  test('should display balance card for the active kid', async ({ authenticatedPage: page }) => {
    // Single kid (Emma) is auto-selected — the balance renders without any selection.
    await expect(page.getByText('500')).toBeVisible();
    await expect(page.getByText('$5.00')).toBeVisible();
  });

  test('should allow requesting a payout', async ({ authenticatedPage: page }) => {
    await page.getByPlaceholder('Enter points').fill('200');
    await page.getByRole('button', { name: /Request Payout/i }).click();

    // A pending payout should appear
    await expect(page.getByText(/pending/i).first()).toBeVisible();
  });

  test('should show payout method options', async ({ authenticatedPage: page }) => {
    await expect(page.getByRole('button', { name: /Cash/i })).toBeVisible();
  });

  test('should navigate to allowance from bottom nav', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.getByTestId('nav-allowance').click();
    await expect(page).toHaveURL('/allowance');
  });
});
