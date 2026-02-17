import { test as base, Page, APIRequestContext } from '@playwright/test';

// API URL - use environment variable or localhost default
const API_URL = process.env.API_URL || 'http://localhost:3103';

// Test user credentials
const TEST_USER = {
  email: 'e2e-test@kidschores.com',
  password: 'TestPassword123',
  displayName: 'E2E Test Parent',
};

/**
 * Auth fixture interface
 */
export interface AuthFixtures {
  /** Authenticated page with session */
  authenticatedPage: Page;
  /** Auth tokens */
  authTokens: { accessToken: string; refreshToken: string };
}

/**
 * Get or create test user and return auth tokens
 */
async function getAuthTokens(apiContext: APIRequestContext): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  // Try to login first
  let loginResp = await apiContext.post('/api/auth/login', {
    data: {
      email: TEST_USER.email,
      password: TEST_USER.password,
    },
  });

  if (loginResp.ok()) {
    const data = await loginResp.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  }

  // If login fails (user doesn't exist), register
  const registerResp = await apiContext.post('/api/auth/register', {
    data: {
      email: TEST_USER.email,
      password: TEST_USER.password,
      display_name: TEST_USER.displayName,
    },
  });

  if (registerResp.ok()) {
    const data = await registerResp.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  }

  // If registration also fails (maybe user exists but wrong password), throw
  throw new Error(`Failed to authenticate test user: ${await registerResp.text()}`);
}

/**
 * Set auth tokens in browser localStorage
 */
async function setAuthInBrowser(
  page: Page,
  tokens: { accessToken: string; refreshToken: string }
): Promise<void> {
  // Navigate to the app first to set cookies on the right origin
  await page.goto('/login');

  // Set tokens in localStorage (matching the AuthContext storage pattern)
  // AuthContext uses 'kc_access_token' and 'kc_refresh_token' keys
  await page.evaluate((tokens) => {
    localStorage.setItem('kc_access_token', tokens.accessToken);
    localStorage.setItem('kc_refresh_token', tokens.refreshToken);
  }, tokens);

  // Navigate to home to trigger auth check
  await page.goto('/');

  // Wait for redirect to complete (might go to select-kid page)
  await page.waitForLoadState('networkidle');

  // If we're on select-kid page, continue as parent
  if (page.url().includes('/select-kid')) {
    const continueButton = page.getByRole('button', { name: /continue as parent/i });
    if (await continueButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await continueButton.click();
      await page.waitForURL((url) => !url.pathname.includes('/select-kid'), {
        timeout: 5000,
      });
    }
  }
}

/**
 * Extended test with auth fixtures
 */
export const test = base.extend<AuthFixtures>({
  // Auth tokens fixture
  authTokens: async ({ playwright }, use) => {
    const apiContext = await playwright.request.newContext({
      baseURL: API_URL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
      },
      ignoreHTTPSErrors: true,
    });

    const tokens = await getAuthTokens(apiContext);
    await use(tokens);

    await apiContext.dispose();
  },

  // Authenticated page fixture
  authenticatedPage: async ({ page, authTokens }, use) => {
    await setAuthInBrowser(page, authTokens);
    await use(page);
  },
});

// Re-export expect for convenience
export { expect } from '@playwright/test';

// Export test user info for tests that need it
export { TEST_USER };
