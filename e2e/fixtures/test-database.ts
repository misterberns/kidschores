import { test as base, APIRequestContext, Page } from '@playwright/test';

// API URL - use deployed instance
const DEPLOYED_URL = 'https://localhost:3103';
const API_URL = process.env.API_URL || DEPLOYED_URL;

// Test user credentials
const TEST_USER = {
  email: 'e2e-test@kidschores.com',
  password: 'TestPassword123',
  displayName: 'E2E Test Parent',
};

/**
 * Manual cleanup fallback - deletes entities one by one via individual API calls
 */
async function manualCleanup(apiContext: APIRequestContext): Promise<void> {
  try {
    // Delete all rewards
    const rewardsResp = await apiContext.get('/api/rewards');
    if (rewardsResp.ok()) {
      const rewards = await rewardsResp.json();
      for (const reward of rewards) {
        await apiContext.delete(`/api/rewards/${reward.id}`);
      }
    }

    // Delete all chores
    const choresResp = await apiContext.get('/api/chores');
    if (choresResp.ok()) {
      const chores = await choresResp.json();
      for (const chore of chores) {
        await apiContext.delete(`/api/chores/${chore.id}`);
      }
    }

    // Delete all kids
    const kidsResp = await apiContext.get('/api/kids');
    if (kidsResp.ok()) {
      const kids = await kidsResp.json();
      for (const kid of kids) {
        await apiContext.delete(`/api/kids/${kid.id}`);
      }
    }

    // Delete all parents
    const parentsResp = await apiContext.get('/api/parents');
    if (parentsResp.ok()) {
      const parents = await parentsResp.json();
      for (const parent of parents) {
        await apiContext.delete(`/api/parents/${parent.id}`);
      }
    }
  } catch (error) {
    console.log('Error during manual cleanup:', error);
  }
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

  // If registration also fails, throw
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
 * Extended test fixtures for KidsChores E2E tests
 */
export interface TestFixtures {
  /** API request context for making HTTP requests (unauthenticated) */
  apiContext: APIRequestContext;
  /** Authenticated API context with auth headers */
  authApiContext: APIRequestContext;
  /** Reset database to clean state before test */
  resetDatabase: () => Promise<void>;
  /** Auth tokens for authenticated requests */
  authTokens: { accessToken: string; refreshToken: string };
  /** Authenticated page with session */
  authenticatedPage: Page;
}

/**
 * Extended test with custom fixtures
 */
export const test = base.extend<TestFixtures>({
  // Create an API context for making requests
  apiContext: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({
      baseURL: API_URL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
      },
      ignoreHTTPSErrors: true, // Accept self-signed certificates
    });
    await use(context);
    await context.dispose();
  },

  // Database reset fixture - uses dedicated /api/test/reset endpoint
  resetDatabase: async ({ apiContext }, use) => {
    const reset = async () => {
      try {
        // Use the dedicated reset endpoint for atomic, reliable cleanup
        const resp = await apiContext.post('/api/test/reset');
        if (!resp.ok()) {
          console.log('Reset endpoint failed, falling back to manual cleanup');
          // Fallback: delete entities one by one if reset endpoint fails
          await manualCleanup(apiContext);
        }
      } catch (error) {
        console.log('Error calling reset endpoint:', error);
        // Fallback to manual cleanup
        await manualCleanup(apiContext);
      }

      // Small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 50));
    };

    // Reset before test starts
    await reset();

    // Provide reset function to test (can call again if needed)
    await use(reset);
  },

  // Auth tokens fixture
  authTokens: async ({ apiContext }, use) => {
    const tokens = await getAuthTokens(apiContext);
    await use(tokens);
  },

  // Authenticated API context fixture
  authApiContext: async ({ playwright, authTokens }, use) => {
    const context = await playwright.request.newContext({
      baseURL: API_URL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authTokens.accessToken}`,
      },
      ignoreHTTPSErrors: true,
    });
    await use(context);
    await context.dispose();
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
