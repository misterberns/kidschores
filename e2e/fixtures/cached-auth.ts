/**
 * Shared cached authentication for e2e tests.
 *
 * Problem: The backend rate-limits /api/auth/login to 5 requests per 5 minutes.
 * The standard test-database.ts fixtures call login ONCE PER TEST, which exhausts
 * the limit after 5 tests. Running multiple spec files compounds the problem since
 * each file's module-level cache is independent.
 *
 * Solution: File-based token cache. The first test to authenticate writes tokens to
 * a temp file. All subsequent tests (even in other spec files / workers) read from
 * the file, resulting in exactly ONE login call per test run.
 */
import { Page, APIRequestContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const API_URL = process.env.API_URL || 'http://localhost:3103';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3103';
const TEST_USER = {
  email: 'e2e-test@kidschores.com',
  password: 'TestPassword123',
  displayName: 'E2E Test Parent',
};

const TOKEN_CACHE_FILE = path.join(os.tmpdir(), 'kc-e2e-tokens.json');
const TOKEN_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

// In-memory cache for this process
let cachedTokens: { accessToken: string; refreshToken: string } | null = null;

export async function getOrCacheTokens(playwright: any): Promise<{ accessToken: string; refreshToken: string }> {
  // 1. In-memory cache (fastest)
  if (cachedTokens) return cachedTokens;

  // 2. File-based cache (cross-file / cross-worker)
  try {
    if (fs.existsSync(TOKEN_CACHE_FILE)) {
      const stat = fs.statSync(TOKEN_CACHE_FILE);
      if (Date.now() - stat.mtimeMs < TOKEN_MAX_AGE_MS) {
        cachedTokens = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf-8'));
        return cachedTokens!;
      }
    }
  } catch { /* file corrupt or stale — re-authenticate */ }

  // 3. Authenticate against the live backend
  const ctx = await playwright.request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
    ignoreHTTPSErrors: true,
  });

  const loginResp = await ctx.post('/api/auth/login', {
    data: { email: TEST_USER.email, password: TEST_USER.password },
  });

  if (loginResp.ok()) {
    const data = await loginResp.json();
    cachedTokens = { accessToken: data.access_token, refreshToken: data.refresh_token };
    await ctx.dispose();
    fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify(cachedTokens));
    return cachedTokens;
  }

  // Login failed (401 = user doesn't exist yet, 429 = rate limited)
  // Only try register if it wasn't a rate limit
  if (loginResp.status() !== 429) {
    const regResp = await ctx.post('/api/auth/register', {
      data: { email: TEST_USER.email, password: TEST_USER.password, display_name: TEST_USER.displayName },
    });

    if (regResp.ok()) {
      const data = await regResp.json();
      cachedTokens = { accessToken: data.access_token, refreshToken: data.refresh_token };
      await ctx.dispose();
      fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify(cachedTokens));
      return cachedTokens;
    }

    const errorText = await regResp.text();
    await ctx.dispose();
    throw new Error(`Failed to authenticate (login ${loginResp.status()}, register ${regResp.status()}): ${errorText}`);
  }

  await ctx.dispose();
  throw new Error(`Rate limited on login (429). Wait 5 minutes or delete ${TOKEN_CACHE_FILE} and retry.`);
}

export async function authenticatePage(page: Page, playwright: any): Promise<void> {
  const tokens = await getOrCacheTokens(playwright);
  await page.goto(`${FRONTEND_URL}/login`);
  await page.evaluate((t) => {
    localStorage.setItem('kc_access_token', t.accessToken);
    localStorage.setItem('kc_refresh_token', t.refreshToken);
  }, tokens);
  await page.goto(`${FRONTEND_URL}/`);
  await page.waitForLoadState('networkidle');

  if (page.url().includes('/select-kid')) {
    const continueBtn = page.getByRole('button', { name: /continue as parent/i });
    if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForURL((url) => !url.pathname.includes('/select-kid'), { timeout: 5000 });
    }
  }
}

export async function getAuthApiContext(playwright: any): Promise<APIRequestContext> {
  const tokens = await getOrCacheTokens(playwright);
  return playwright.request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokens.accessToken}`,
    },
    ignoreHTTPSErrors: true,
  });
}

export { API_URL, FRONTEND_URL, TEST_USER };
