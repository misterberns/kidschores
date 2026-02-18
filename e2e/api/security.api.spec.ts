import { test as base, expect, APIRequestContext } from '@playwright/test';
import { TestData } from '../fixtures/test-data';
import { getOrCacheTokens, API_URL, TEST_USER } from '../fixtures/cached-auth';

// Custom test fixture with cached auth context
const test = base.extend<{
  authCtx: APIRequestContext;
}>({
  authCtx: async ({ playwright }, use) => {
    const tokens = await getOrCacheTokens(playwright);
    const ctx = await playwright.request.newContext({
      baseURL: API_URL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.accessToken}`,
      },
      ignoreHTTPSErrors: true,
    });
    await use(ctx);
    await ctx.dispose();
  },
});

/**
 * Helper: manual cleanup (same logic as test-database.ts fallback)
 */
async function cleanupEntities(ctx: APIRequestContext): Promise<void> {
  try {
    for (const entity of ['rewards', 'chores', 'kids', 'parents']) {
      const resp = await ctx.get(`/api/${entity}`);
      if (resp.ok()) {
        const items = await resp.json();
        for (const item of items) {
          await ctx.delete(`/api/${entity}/${item.id}`);
        }
      }
    }
  } catch { /* best effort */ }
}


test.describe('Security — JWT Authentication', () => {
  test('rejects requests without Authorization header', async ({ playwright }) => {
    const unauthCtx = await playwright.request.newContext({
      baseURL: API_URL,
      extraHTTPHeaders: { 'Content-Type': 'application/json' },
      ignoreHTTPSErrors: true,
    });

    const response = await unauthCtx.get('/api/kids');
    expect(response.status()).toBe(401);
    await unauthCtx.dispose();
  });

  test('rejects requests with malformed Bearer token', async ({ playwright }) => {
    const badCtx = await playwright.request.newContext({
      baseURL: API_URL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer not-a-valid-jwt-token',
      },
      ignoreHTTPSErrors: true,
    });

    const response = await badCtx.get('/api/kids');
    expect(response.status()).toBe(401);
    await badCtx.dispose();
  });

  test('accepts valid Bearer token', async ({ authCtx }) => {
    const response = await authCtx.get('/api/kids');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('refresh endpoint rejects invalid refresh token', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
      baseURL: API_URL,
      extraHTTPHeaders: { 'Content-Type': 'application/json' },
      ignoreHTTPSErrors: true,
    });

    const response = await ctx.post('/api/auth/refresh', {
      data: { refresh_token: 'invalid-refresh-token' },
    });
    expect(response.status()).toBe(401);
    await ctx.dispose();
  });
});

test.describe('Security — Admin Authorization', () => {
  test.beforeEach(async ({ authCtx }) => {
    await cleanupEntities(authCtx);
  });

  test('authenticated user can create kid', async ({ authCtx }) => {
    const response = await authCtx.post('/api/kids', {
      data: TestData.kid.emma(),
    });
    expect(response.ok()).toBeTruthy();
    const kid = await response.json();
    expect(kid.name).toBe('Emma');
  });

  test('authenticated user can create chore', async ({ authCtx }) => {
    const kidResp = await authCtx.post('/api/kids', { data: TestData.kid.emma() });
    const kid = await kidResp.json();

    const response = await authCtx.post('/api/chores', {
      data: TestData.chore.cleanRoom([kid.id]),
    });
    expect(response.ok()).toBeTruthy();
  });

  test('authenticated user can create reward', async ({ authCtx }) => {
    const response = await authCtx.post('/api/rewards', {
      data: TestData.reward.screenTime(),
    });
    expect(response.ok()).toBeTruthy();
  });

  test('authenticated user can delete entities', async ({ authCtx }) => {
    const createResp = await authCtx.post('/api/kids', { data: TestData.kid.emma() });
    const kid = await createResp.json();

    const deleteResp = await authCtx.delete(`/api/kids/${kid.id}`);
    expect(deleteResp.ok()).toBeTruthy();

    const getResp = await authCtx.get(`/api/kids/${kid.id}`);
    expect(getResp.status()).toBe(404);
  });
});

test.describe('Security — Unauthenticated Access', () => {
  test('unauthenticated user cannot create kid', async ({ playwright }) => {
    const unauthCtx = await playwright.request.newContext({
      baseURL: API_URL,
      extraHTTPHeaders: { 'Content-Type': 'application/json' },
      ignoreHTTPSErrors: true,
    });

    const response = await unauthCtx.post('/api/kids', {
      data: TestData.kid.emma(),
    });
    expect(response.status()).toBe(401);
    await unauthCtx.dispose();
  });

  test('unauthenticated user cannot list kids', async ({ playwright }) => {
    const unauthCtx = await playwright.request.newContext({
      baseURL: API_URL,
      extraHTTPHeaders: { 'Content-Type': 'application/json' },
      ignoreHTTPSErrors: true,
    });

    const response = await unauthCtx.get('/api/kids');
    expect(response.status()).toBe(401);
    await unauthCtx.dispose();
  });

  test('unauthenticated user cannot access rewards', async ({ playwright }) => {
    const unauthCtx = await playwright.request.newContext({
      baseURL: API_URL,
      extraHTTPHeaders: { 'Content-Type': 'application/json' },
      ignoreHTTPSErrors: true,
    });

    const response = await unauthCtx.get('/api/rewards');
    expect(response.status()).toBe(401);
    await unauthCtx.dispose();
  });
});

test.describe('Security — PIN Verification', () => {
  let parentId: string;

  test.beforeEach(async ({ authCtx }) => {
    await cleanupEntities(authCtx);

    const kidResp = await authCtx.post('/api/kids', { data: TestData.kid.emma() });
    const kid = await kidResp.json();

    const parentResp = await authCtx.post('/api/parents', {
      data: { ...TestData.parent.mom([kid.id]), pin: '1234' },
    });
    parentId = (await parentResp.json()).id;
  });

  test('correct PIN returns 200 with valid=true', async ({ authCtx }) => {
    const response = await authCtx.post(`/api/parents/${parentId}/verify-pin`, {
      data: { pin: '1234' },
    });
    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.valid).toBe(true);
  });

  test('incorrect PIN returns 401', async ({ authCtx }) => {
    const response = await authCtx.post(`/api/parents/${parentId}/verify-pin`, {
      data: { pin: '9999' },
    });
    expect(response.status()).toBe(401);
  });

  test('PIN is not exposed in GET /api/parents response', async ({ authCtx }) => {
    const response = await authCtx.get(`/api/parents/${parentId}`);
    expect(response.ok()).toBeTruthy();
    const parent = await response.json();

    expect(parent.pin).toBeFalsy();
    expect(parent.pin_hash).toBeUndefined();
    const body = JSON.stringify(parent);
    expect(body).not.toContain('"1234"');
  });
});

test.describe('Security — Input Handling', () => {
  test.beforeEach(async ({ authCtx }) => {
    await cleanupEntities(authCtx);
  });

  test('kid name with HTML tags is stored and retrieved safely', async ({ authCtx }) => {
    const xssName = '<script>alert("xss")</script>';

    const response = await authCtx.post('/api/kids', {
      data: { name: xssName, enable_notifications: true },
    });

    if (response.ok()) {
      const kid = await response.json();
      const getResp = await authCtx.get(`/api/kids/${kid.id}`);
      const retrieved = await getResp.json();
      expect(retrieved.name).toBe(xssName);
    } else {
      expect([400, 422]).toContain(response.status());
    }
  });

  test('chore name with HTML entities is handled correctly', async ({ authCtx }) => {
    const kidResp = await authCtx.post('/api/kids', { data: TestData.kid.emma() });
    const kid = await kidResp.json();

    const htmlName = 'Clean <Room> & "Bathroom"';
    const response = await authCtx.post('/api/chores', {
      data: {
        ...TestData.chore.cleanRoom([kid.id]),
        name: htmlName,
      },
    });

    if (response.ok()) {
      const chore = await response.json();
      const getResp = await authCtx.get(`/api/chores/${chore.id}`);
      const retrieved = await getResp.json();
      expect(retrieved.name).toBe(htmlName);
    } else {
      expect([400, 422]).toContain(response.status());
    }
  });

  test('reward name with script payload is handled safely', async ({ authCtx }) => {
    const payload = '<img src=x onerror=alert(1)>';
    const response = await authCtx.post('/api/rewards', {
      data: {
        ...TestData.reward.screenTime(),
        name: payload,
      },
    });

    if (response.ok()) {
      const reward = await response.json();
      const getResp = await authCtx.get(`/api/rewards/${reward.id}`);
      const retrieved = await getResp.json();
      expect(retrieved.name).toBe(payload);
    } else {
      expect([400, 422]).toContain(response.status());
    }
  });
});

// IMPORTANT: Rate limiting test triggers a 5-minute IP ban on /api/auth/login.
// Run in isolation: SKIP_RATE_LIMIT_TEST= npx playwright test --project=api -g "Rate Limiting"
// Skipped by default to avoid poisoning auth for ALL tests in the session.
test.describe('Security — Rate Limiting', () => {
  // Skip unless explicitly enabled
  test.skip(process.env.SKIP_RATE_LIMIT_TEST !== '0', 'Run with SKIP_RATE_LIMIT_TEST=0 to enable');

  test('login rate limit returns 429 after too many attempts', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
      baseURL: API_URL,
      extraHTTPHeaders: { 'Content-Type': 'application/json' },
      ignoreHTTPSErrors: true,
    });

    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const response = await ctx.post('/api/auth/login', {
        data: {
          email: `ratelimit-test-${Date.now()}@kidschores.com`,
          password: 'wrongpassword',
        },
      });
      statuses.push(response.status());
    }

    const allValid = statuses.every(s => s === 401 || s === 429);
    expect(allValid).toBe(true);
    expect(statuses[5]).toBe(429);

    await ctx.dispose();
  });
});
