import { test, expect } from '../fixtures/test-database';
import { TestData } from '../fixtures/test-data';

test.describe('Allowance Page', () => {
  let kidId: string;

  test.beforeEach(async ({ page, apiContext, resetDatabase }) => {
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

  test('should display allowance page', async ({ page }) => {
    await expect(page.getByText('Allowance')).toBeVisible();
  });

  test('should show kid selector', async ({ page }) => {
    await expect(page.getByRole('combobox')).toBeVisible();
  });

  test('should display balance card when kid is selected', async ({ page }) => {
    // Select kid
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Emma' }).click();

    // Should show balance
    await expect(page.getByText('500')).toBeVisible();
    await expect(page.getByText('$5.00')).toBeVisible();
  });

  test('should allow requesting a payout', async ({ page }) => {
    // Select kid
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Emma' }).click();

    // Fill in payout request form
    await page.getByLabel('Points to Convert').fill('200');
    await page.getByRole('button', { name: /Request Payout/i }).click();

    // Should show success or pending payout
    await expect(page.getByText('200')).toBeVisible();
    await expect(page.getByText('pending')).toBeVisible();
  });

  test('should show payout method options', async ({ page }) => {
    // Select kid
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Emma' }).click();

    // Check payment method options
    await expect(page.getByText('Cash')).toBeVisible();
  });

  test('should navigate to allowance from bottom nav', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-allowance').click();
    await expect(page).toHaveURL('/allowance');
  });
});
