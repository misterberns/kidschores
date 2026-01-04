import { test, expect } from '../fixtures/test-database';
import { TestData } from '../fixtures/test-data';

test.describe('History Page', () => {
  let kidId: string;
  let choreId: string;

  test.beforeEach(async ({ page, apiContext, resetDatabase }) => {
    await resetDatabase();

    // Create a test kid
    const kidResp = await apiContext.post('/api/kids', { data: TestData.kid.emma() });
    const kid = await kidResp.json();
    kidId = kid.id;

    // Create and complete a chore
    const choreResp = await apiContext.post('/api/chores', {
      data: TestData.chore.cleanRoom([kidId]),
    });
    const chore = await choreResp.json();
    choreId = chore.id;

    await apiContext.post(`/api/chores/${choreId}/claim`, { data: { kid_id: kidId } });
    await apiContext.post(`/api/chores/${choreId}/approve`, { data: { parent_name: 'Mom' } });

    // Navigate to history page
    await page.goto('/history');
  });

  test('should display history page', async ({ page }) => {
    await expect(page.getByText('History')).toBeVisible();
  });

  test('should show kid selector', async ({ page }) => {
    await expect(page.getByRole('combobox')).toBeVisible();
  });

  test('should show view mode tabs', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /Stats/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Calendar/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /List/i })).toBeVisible();
  });

  test('should display stats when kid is selected', async ({ page }) => {
    // Select kid
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Emma' }).click();

    // Should show stats
    await expect(page.getByText('Total Chores')).toBeVisible();
    await expect(page.getByText('Total Points')).toBeVisible();
  });

  test('should switch between view modes', async ({ page }) => {
    // Select kid
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Emma' }).click();

    // Switch to calendar view
    await page.getByRole('tab', { name: /Calendar/i }).click();
    await expect(page.getByText(/January|February|March|April|May|June|July|August|September|October|November|December/)).toBeVisible();

    // Switch to list view
    await page.getByRole('tab', { name: /List/i }).click();
    await expect(page.getByText('Clean Room')).toBeVisible();
  });

  test('should show completed chore in list view', async ({ page }) => {
    // Select kid
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Emma' }).click();

    // Go to list view
    await page.getByRole('tab', { name: /List/i }).click();

    // Should show the completed chore
    await expect(page.getByText('Clean Room')).toBeVisible();
    await expect(page.getByText('approved')).toBeVisible();
    await expect(page.getByText('+25')).toBeVisible();
  });

  test('should have export button', async ({ page }) => {
    // Select kid
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Emma' }).click();

    await expect(page.getByRole('button', { name: /Export CSV/i })).toBeVisible();
  });

  test('should navigate to history from bottom nav', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-history').click();
    await expect(page).toHaveURL('/history');
  });

  test('should show total chores count correctly', async ({ page }) => {
    // Select kid
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Emma' }).click();

    // In stats view, should show 1 completed chore
    await expect(page.getByText('1')).toBeVisible();
  });

  test('should show points earned correctly', async ({ page }) => {
    // Select kid
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Emma' }).click();

    // Should show 25 points earned from the chore
    await expect(page.getByText('25')).toBeVisible();
  });
});
