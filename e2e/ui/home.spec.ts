import { test, expect } from '../fixtures/test-database';
import { HomePage } from '../pages/HomePage';
import { TestData } from '../fixtures/test-data';

test.describe('Home Page', () => {
  test.beforeEach(async ({ resetDatabase }) => {
    await resetDatabase();
  });

  test.describe('Empty State', () => {
    test('should show empty state when no kids exist', async ({ page }) => {
      const homePage = new HomePage(page);
      await homePage.goto();

      await homePage.waitForKidsToLoad();
      expect(await homePage.hasNoKids()).toBe(true);
    });
  });

  test.describe('Kid Display', () => {
    test('should display kid card with name and points', async ({ page, apiContext }) => {
      // Create a kid via API
      await apiContext.post('/api/kids', { data: TestData.kid.emma() });

      const homePage = new HomePage(page);
      await homePage.goto();
      await homePage.waitForKidsToLoad();

      expect(await homePage.isKidVisible('Emma')).toBe(true);
      expect(await homePage.getKidPoints('Emma')).toBe(0);
    });

    test('should display multiple kids', async ({ page, apiContext }) => {
      await apiContext.post('/api/kids', { data: TestData.kid.emma() });
      await apiContext.post('/api/kids', { data: TestData.kid.jack() });

      const homePage = new HomePage(page);
      await homePage.goto();
      await homePage.waitForKidsToLoad();

      expect(await homePage.getKidCount()).toBe(2);
      expect(await homePage.isKidVisible('Emma')).toBe(true);
      expect(await homePage.isKidVisible('Jack')).toBe(true);
    });

    test('should display updated points', async ({ page, apiContext }) => {
      const kidResp = await apiContext.post('/api/kids', { data: TestData.kid.emma() });
      const kid = await kidResp.json();

      // Add points
      await apiContext.post(`/api/kids/${kid.id}/points`, { data: { points: 75 } });

      const homePage = new HomePage(page);
      await homePage.goto();
      await homePage.waitForKidsToLoad();

      expect(await homePage.getKidPoints('Emma')).toBe(75);
    });
  });

  test.describe('Navigation', () => {
    test('should have navigation to other pages', async ({ page }) => {
      const homePage = new HomePage(page);
      await homePage.goto();

      // Check navigation links exist
      await expect(page.getByRole('link', { name: /chores/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /rewards/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /admin/i })).toBeVisible();
    });

    test('should navigate to chores page', async ({ page }) => {
      const homePage = new HomePage(page);
      await homePage.goto();

      await page.getByRole('link', { name: /chores/i }).click();
      await expect(page).toHaveURL(/\/chores/);
    });

    test('should navigate to rewards page', async ({ page }) => {
      const homePage = new HomePage(page);
      await homePage.goto();

      await page.getByRole('link', { name: /rewards/i }).click();
      await expect(page).toHaveURL(/\/rewards/);
    });

    test('should navigate to admin page', async ({ page }) => {
      const homePage = new HomePage(page);
      await homePage.goto();

      await page.getByRole('link', { name: /admin/i }).click();
      await expect(page).toHaveURL(/\/admin/);
    });
  });

  test.describe('Responsive Design', () => {
    test('should display correctly on mobile', async ({ page, apiContext }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await apiContext.post('/api/kids', { data: TestData.kid.emma() });

      const homePage = new HomePage(page);
      await homePage.goto();
      await homePage.waitForKidsToLoad();

      expect(await homePage.isKidVisible('Emma')).toBe(true);
    });

    test('should display correctly on tablet', async ({ page, apiContext }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      await apiContext.post('/api/kids', { data: TestData.kid.emma() });
      await apiContext.post('/api/kids', { data: TestData.kid.jack() });

      const homePage = new HomePage(page);
      await homePage.goto();
      await homePage.waitForKidsToLoad();

      expect(await homePage.getKidCount()).toBe(2);
    });
  });
});
