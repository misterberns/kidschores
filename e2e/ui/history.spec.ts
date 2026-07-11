import { test, expect } from '../fixtures/test-database';
import { TestData } from '../fixtures/test-data';

test.describe('History Page', () => {
  let kidId: string;
  let choreId: string;

  test.beforeEach(async ({ authenticatedPage: page, apiContext, resetDatabase }) => {
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

  test('should display history page', async ({ authenticatedPage: page }) => {
    // getByText('History') is ambiguous (page heading + bottom-nav label) —
    // strict mode flags it under the updated deps. Pin the heading instead.
    await expect(page.getByRole('heading', { name: 'History & Stats' })).toBeVisible();
  });

  test('should show kid selector when there are multiple kids', async ({ authenticatedPage: page, apiContext }) => {
    // The kid selector (a "Select kid" tablist) only renders with 2+ kids.
    await apiContext.post('/api/kids', { data: TestData.kid.jack() });
    await page.reload();

    await expect(page.getByRole('tablist', { name: /select kid/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Emma' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Jack' })).toBeVisible();
  });

  test('should show view mode tabs', async ({ authenticatedPage: page }) => {
    await expect(page.getByRole('tab', { name: /Stats/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Calendar/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /List/i })).toBeVisible();
  });

  test('should display stats for the active kid', async ({ authenticatedPage: page }) => {
    // Single kid (Emma) is auto-selected; stats is the default view.
    await expect(page.getByText('Total Completed')).toBeVisible();
    await expect(page.getByText('Total Points')).toBeVisible();
  });

  test('should switch between view modes', async ({ authenticatedPage: page }) => {
    // Switch to calendar view
    await page.getByRole('tab', { name: /Calendar/i }).click();
    await expect(
      page.getByText(/January|February|March|April|May|June|July|August|September|October|November|December/)
    ).toBeVisible();

    // Switch to list view
    await page.getByRole('tab', { name: /List/i }).click();
    await expect(page.getByText('Clean Room')).toBeVisible();
  });

  test('should show completed chore in list view', async ({ authenticatedPage: page }) => {
    await page.getByRole('tab', { name: /List/i }).click();

    await expect(page.getByText('Clean Room')).toBeVisible();
    await expect(page.getByText('approved')).toBeVisible();
    await expect(page.getByText('+25')).toBeVisible();
  });

  test('should have export button', async ({ authenticatedPage: page }) => {
    await expect(page.getByRole('button', { name: /Export/i })).toBeVisible();
  });

  test('should navigate to history from bottom nav', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.getByTestId('nav-history').click();
    await expect(page).toHaveURL('/history');
  });

  test('should show total chores count correctly', async ({ authenticatedPage: page }) => {
    // The StatCard renders the value in a <p> immediately before the title <p>.
    const totalCompletedValue = page
      .getByText('Total Completed', { exact: true })
      .locator('xpath=preceding-sibling::p[1]');
    await expect(totalCompletedValue).toHaveText('1');
  });

  test('should show points earned correctly', async ({ authenticatedPage: page }) => {
    const totalPointsValue = page
      .getByText('Total Points', { exact: true })
      .locator('xpath=preceding-sibling::p[1]');
    await expect(totalPointsValue).toHaveText('25');
  });
});
