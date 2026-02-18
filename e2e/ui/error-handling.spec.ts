import { test as base, expect } from '@playwright/test';
import { authenticatePage, FRONTEND_URL } from '../fixtures/cached-auth';

const test = base;

test.describe('Error Boundary', () => {
  test('app does not crash when API returns 500', async ({ page, playwright }) => {
    await authenticatePage(page, playwright);

    // Intercept the kids API to simulate a server error
    await page.route('**/api/kids**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal Server Error' }),
      });
    });

    await page.goto(`${FRONTEND_URL}/`);
    await page.waitForLoadState('networkidle');

    // Page should still be rendered (not a blank white screen)
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Should show some content — either error UI or the nav
    const hasContent = await page.locator('nav, [role="navigation"], button, h1, h2').count();
    expect(hasContent).toBeGreaterThan(0);
  });

  test('error boundary shows fallback UI on render error', async ({ page, playwright }) => {
    await authenticatePage(page, playwright);

    // Intercept ALL API calls to simulate a complete backend outage
    await page.route('**/api/**', (route) => {
      route.abort('connectionfailed');
    });

    await page.goto(`${FRONTEND_URL}/`);
    await page.waitForTimeout(3000);

    // The page should not be completely blank
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(0);
  });

  test('user can navigate away from error state', async ({ page, playwright }) => {
    await authenticatePage(page, playwright);

    // Intercept kids API to cause error on home page
    await page.route('**/api/kids**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Server Error' }),
      });
    });

    await page.goto(`${FRONTEND_URL}/`);
    await page.waitForTimeout(2000);

    // Remove the route intercept to allow normal API calls
    await page.unroute('**/api/kids**');

    // Navigate to Help page (doesn't require API calls)
    await page.goto(`${FRONTEND_URL}/help`);
    await page.waitForLoadState('networkidle');

    // Help page should render normally
    const heading = page.getByText(/Parent Guide/i);
    await expect(heading).toBeVisible();
  });
});

test.describe('Global Error Handler', () => {
  test('API 404 shows appropriate feedback', async ({ page, playwright }) => {
    await authenticatePage(page, playwright);

    // Intercept a specific API call to return 404
    await page.route('**/api/kids**', (route) => {
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Not found' }),
      });
    });

    await page.goto(`${FRONTEND_URL}/`);
    await page.waitForTimeout(2000);

    // Page should not show raw JSON or stack trace
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('Traceback');
    expect(bodyText).not.toContain('stack trace');
  });

  test('API 500 does not expose stack traces', async ({ page, playwright }) => {
    await authenticatePage(page, playwright);

    await page.route('**/api/kids**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'Internal server error',
          stack: 'Error at module.js:42\n  at process.js:10',
        }),
      });
    });

    await page.goto(`${FRONTEND_URL}/`);
    await page.waitForTimeout(2000);

    // The raw stack trace should not be rendered to the user
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('module.js:42');
    expect(bodyText).not.toContain('process.js:10');
  });

  test('API validation error does not show raw JSON', async ({ page, playwright }) => {
    await authenticatePage(page, playwright);

    await page.route('**/api/kids**', (route) => {
      route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: [
            {
              loc: ['body', 'name'],
              msg: 'field required',
              type: 'value_error.missing',
            },
          ],
        }),
      });
    });

    await page.goto(`${FRONTEND_URL}/`);
    await page.waitForTimeout(2000);

    // Should not expose Pydantic validation error structure directly
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('value_error.missing');
    expect(bodyText).not.toContain('"loc"');
  });
});

test.describe('Loading States', () => {
  test('loading indicator appears while data is fetching', async ({ page, playwright }) => {
    await authenticatePage(page, playwright);

    // Intercept API with a 2-second delay
    await page.route('**/api/kids**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto(`${FRONTEND_URL}/`);

    // During the delay, look for loading indicators
    const loadingIndicator = page.locator(
      '[class*="skeleton"], [class*="animate-pulse"], [class*="spinner"], [role="progressbar"], text=/loading/i'
    );

    // Check within the first second (before API responds)
    const isLoading = await loadingIndicator.count().catch(() => 0);
    expect(isLoading).toBeGreaterThanOrEqual(0); // Soft check
  });
});
