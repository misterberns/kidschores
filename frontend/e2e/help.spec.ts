import { test, expect } from '@playwright/test';

// Test credentials - created via API registration
const TEST_USER = {
  email: 'e2etest@example.com',
  password: 'TestPassword123',
};

// Helper to login
async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  // Wait for redirect to home or kid selection
  await page.waitForURL(/\/(select-kid)?$/);
}

test.describe('App Loading', () => {
  test('login page loads correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'KidsChores' })).toBeVisible();
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
  });
});

test.describe('Help Section (authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('help page loads and shows Parent Guide heading', async ({ page }) => {
    await page.goto('/help');
    await expect(page.getByRole('heading', { name: 'Parent Guide' })).toBeVisible();
  });

  test('help button is visible in admin page', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('link', { name: /help/i })).toBeVisible();
  });

  test('help button navigates to help page', async ({ page }) => {
    await page.goto('/admin');
    await page.getByRole('link', { name: /help/i }).click();
    await expect(page).toHaveURL(/\/help/);
  });
});
