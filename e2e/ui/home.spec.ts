import { test, expect } from '../fixtures/test-database';
import { HomePage } from '../pages/HomePage';

// Generate unique names for test data to avoid conflicts with leftover data
const uniqueId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

test.describe('Home Page', () => {
  let testId: string;

  test.beforeEach(async ({ resetDatabase }) => {
    // Try to reset, but tests should still work with leftover data
    try {
      await resetDatabase();
    } catch (e) {
      console.log('Reset failed, continuing with existing data');
    }
    testId = uniqueId(); // Unique ID for this test run
  });

  test.describe('Empty State', () => {
    test('should show empty state when no kids exist', async ({ authenticatedPage }) => {
      const homePage = new HomePage(authenticatedPage);
      await homePage.goto();

      await homePage.waitForKidsToLoad();
      expect(await homePage.hasNoKids()).toBe(true);
    });
  });

  test.describe('Kid Display', () => {
    test('should display kid card with name and points', async ({ authenticatedPage, authApiContext }) => {
      const kidName = `Kid_${testId}`;
      // Create a kid via API
      await authApiContext.post('/api/kids', { data: { name: kidName, enable_notifications: true } });

      const homePage = new HomePage(authenticatedPage);
      await homePage.goto();
      // Reload to ensure React Query fetches fresh data from API
      await authenticatedPage.reload({ waitUntil: 'networkidle' });
      await homePage.waitForKidsToLoad();

      expect(await homePage.isKidVisible(kidName)).toBe(true);
      expect(await homePage.getKidPoints(kidName)).toBe(0);
    });

    test('should display multiple kids', async ({ authenticatedPage, authApiContext }) => {
      const kid1 = `Kid1_${testId}`;
      const kid2 = `Kid2_${testId}`;
      await authApiContext.post('/api/kids', { data: { name: kid1, enable_notifications: true } });
      await authApiContext.post('/api/kids', { data: { name: kid2, enable_notifications: true } });

      const homePage = new HomePage(authenticatedPage);
      await homePage.goto();
      // Reload to ensure React Query fetches fresh data from API
      await authenticatedPage.reload({ waitUntil: 'networkidle' });
      await homePage.waitForKidsToLoad();

      expect(await homePage.isKidVisible(kid1)).toBe(true);
      expect(await homePage.isKidVisible(kid2)).toBe(true);
    });

    test('should display updated points', async ({ authenticatedPage, authApiContext }) => {
      const kidName = `PointsKid_${testId}`;
      const kidResp = await authApiContext.post('/api/kids', { data: { name: kidName, enable_notifications: true } });
      const kid = await kidResp.json();

      // Add points
      await authApiContext.post(`/api/kids/${kid.id}/points`, { data: { points: 75 } });

      const homePage = new HomePage(authenticatedPage);
      await homePage.goto();
      // Reload to ensure React Query fetches fresh data from API
      await authenticatedPage.reload({ waitUntil: 'networkidle' });
      await homePage.waitForKidsToLoad();

      expect(await homePage.getKidPoints(kidName)).toBe(75);
    });
  });

  test.describe('Navigation', () => {
    test('should have navigation to other pages', async ({ authenticatedPage }) => {
      const homePage = new HomePage(authenticatedPage);
      await homePage.goto();

      // Check navigation links exist - admin page may be called "Parent" in the UI
      await expect(authenticatedPage.getByRole('link', { name: /chores/i })).toBeVisible();
      await expect(authenticatedPage.getByRole('link', { name: /rewards/i })).toBeVisible();
      await expect(authenticatedPage.locator('a[href="/admin"]')).toBeVisible();
    });

    test('should navigate to chores page', async ({ authenticatedPage }) => {
      const homePage = new HomePage(authenticatedPage);
      await homePage.goto();

      await authenticatedPage.getByRole('link', { name: /chores/i }).click();
      await expect(authenticatedPage).toHaveURL(/\/chores/);
    });

    test('should navigate to rewards page', async ({ authenticatedPage }) => {
      const homePage = new HomePage(authenticatedPage);
      await homePage.goto();

      await authenticatedPage.getByRole('link', { name: /rewards/i }).click();
      await expect(authenticatedPage).toHaveURL(/\/rewards/);
    });

    test('should navigate to admin page', async ({ authenticatedPage }) => {
      const homePage = new HomePage(authenticatedPage);
      await homePage.goto();

      // Admin page link may be called "Parent" in the UI
      await authenticatedPage.locator('a[href="/admin"]').click();
      await expect(authenticatedPage).toHaveURL(/\/admin/);
    });
  });

  test.describe('Responsive Design', () => {
    test('should display correctly on mobile', async ({ authenticatedPage, authApiContext }) => {
      // Set mobile viewport
      await authenticatedPage.setViewportSize({ width: 375, height: 667 });

      const kidName = `MobileKid_${testId}`;
      await authApiContext.post('/api/kids', { data: { name: kidName, enable_notifications: true } });

      const homePage = new HomePage(authenticatedPage);
      await homePage.goto();
      // Reload to ensure React Query fetches fresh data from API
      await authenticatedPage.reload({ waitUntil: 'networkidle' });
      await homePage.waitForKidsToLoad();

      expect(await homePage.isKidVisible(kidName)).toBe(true);
    });

    test('should display correctly on tablet', async ({ authenticatedPage, authApiContext }) => {
      // Set tablet viewport
      await authenticatedPage.setViewportSize({ width: 768, height: 1024 });

      const kid1 = `TabletKid1_${testId}`;
      const kid2 = `TabletKid2_${testId}`;
      await authApiContext.post('/api/kids', { data: { name: kid1, enable_notifications: true } });
      await authApiContext.post('/api/kids', { data: { name: kid2, enable_notifications: true } });

      const homePage = new HomePage(authenticatedPage);
      await homePage.goto();
      // Reload to ensure React Query fetches fresh data from API
      await authenticatedPage.reload({ waitUntil: 'networkidle' });
      await homePage.waitForKidsToLoad();

      expect(await homePage.isKidVisible(kid1)).toBe(true);
      expect(await homePage.isKidVisible(kid2)).toBe(true);
    });
  });
});
