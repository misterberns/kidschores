import { test as base, APIRequestContext, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// API URL - defaults to test instance on NAS (NOT production port 3103)
const API_URL = process.env.API_URL || 'http://192.168.87.35:3104';

// Test user credentials
const TEST_USER = {
  email: 'e2e-test@kidschores.com',
  password: 'TestPassword123',
  displayName: 'E2E Test Parent',
};

// File-based token cache shared across all test files and workers.
// Solves: module-scoped _cachedTokens only works within a single file import,
// but 17+ spec files each get their own module instance, exhausting the
// backend's 5 req/5min login rate limit.
const TOKEN_CACHE_FILE = path.join(os.tmpdir(), 'kc-e2e-tokens.json');
const TOKEN_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

// In-memory cache for this process (fastest path)
let _cachedTokens: { accessToken: string; refreshToken: string } | null = null;

/**
 * Get or create test user and return auth tokens.
 * Uses a 3-tier cache: in-memory → temp file → API call.
 * The temp file ensures all spec files share one login call per test run.
 */
async function getAuthTokens(apiContext: APIRequestContext): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  // Tier 1: In-memory cache (same process, same file)
  if (_cachedTokens) return _cachedTokens;

  // Tier 2: File-based cache (cross-file, cross-worker)
  try {
    if (fs.existsSync(TOKEN_CACHE_FILE)) {
      const stat = fs.statSync(TOKEN_CACHE_FILE);
      if (Date.now() - stat.mtimeMs < TOKEN_MAX_AGE_MS) {
        _cachedTokens = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf-8'));
        return _cachedTokens!;
      }
    }
  } catch { /* file corrupt or stale — fall through to API */ }

  // Tier 3: Authenticate against the live backend
  const loginResp = await apiContext.post('/api/auth/login', {
    data: {
      email: TEST_USER.email,
      password: TEST_USER.password,
    },
  });

  if (loginResp.ok()) {
    const data = await loginResp.json();
    _cachedTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
    try { fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify(_cachedTokens)); } catch { /* best-effort */ }
    return _cachedTokens;
  }

  // Don't attempt register if rate limited — it won't help
  if (loginResp.status() === 429) {
    throw new Error(
      `Rate limited on login (429). Cached tokens expired or missing.\n` +
      `  Delete ${TOKEN_CACHE_FILE} and wait 5 minutes before retrying.`
    );
  }

  // Login failed (user doesn't exist) — try register
  const registerResp = await apiContext.post('/api/auth/register', {
    data: {
      email: TEST_USER.email,
      password: TEST_USER.password,
      display_name: TEST_USER.displayName,
    },
  });

  if (registerResp.ok()) {
    const data = await registerResp.json();
    _cachedTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
    try { fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify(_cachedTokens)); } catch { /* best-effort */ }
    return _cachedTokens;
  }

  // Both failed
  const registerError = await registerResp.text();
  throw new Error(
    `Failed to authenticate test user.\n` +
    `  Login status: ${loginResp.status()} ${loginResp.statusText()}\n` +
    `  Register status: ${registerResp.status()} ${registerError}`
  );
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
  /** Reset database to clean state before test (safe: targets test instance only) */
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
  // Create an authenticated API context for making requests
  apiContext: async ({ playwright }, use) => {
    // Get auth tokens first (register/login test user)
    const tempCtx = await playwright.request.newContext({
      baseURL: API_URL,
      extraHTTPHeaders: { 'Content-Type': 'application/json' },
      ignoreHTTPSErrors: true,
    });
    const tokens = await getAuthTokens(tempCtx);
    await tempCtx.dispose();

    const context = await playwright.request.newContext({
      baseURL: API_URL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.accessToken}`,
      },
      ignoreHTTPSErrors: true,
    });
    await use(context);
    await context.dispose();
  },

  // Database reset fixture — calls POST /api/test/reset on test instance.
  // Safe because test instance has ENVIRONMENT=test and its own isolated database.
  // NEVER point this at production (port 3103) — the endpoint is blocked there.
  resetDatabase: async ({ apiContext }, use) => {
    const reset = async () => {
      const resp = await apiContext.post('/api/test/reset');
      if (!resp.ok()) {
        const text = await resp.text();
        throw new Error(`resetDatabase failed: ${resp.status()} ${text}`);
      }
    };
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
