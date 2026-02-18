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
 * Track entity IDs created during each test so we only clean up OUR test data.
 * CRITICAL: Never use a blanket "delete all" pattern — it destroys production data
 * when tests run against a shared database. (Incident: CHANGE-048)
 */
const createdIds: { entity: string; id: string }[] = [];

async function trackCreated(
  ctx: APIRequestContext,
  entity: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const resp = await ctx.post(`/api/${entity}`, { data });
  const body = await resp.json();
  if (resp.ok()) {
    createdIds.push({ entity, id: body.id });
  }
  return { ...body, _status: resp.status() };
}

async function cleanupTracked(ctx: APIRequestContext): Promise<void> {
  for (const { entity, id } of [...createdIds].reverse()) {
    try { await ctx.delete(`/api/${entity}/${id}`); } catch { /* best effort */ }
  }
  createdIds.length = 0;
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
  test.afterEach(async ({ authCtx }) => {
    await cleanupTracked(authCtx);
  });

  test('authenticated user can create kid', async ({ authCtx }) => {
    const kid = await trackCreated(authCtx, 'kids', TestData.kid.emma());
    expect(kid._status).toBe(200);
    expect(kid.name).toBe('Emma');
  });

  test('authenticated user can create chore', async ({ authCtx }) => {
    const kid = await trackCreated(authCtx, 'kids', TestData.kid.emma());
    const chore = await trackCreated(authCtx, 'chores', TestData.chore.cleanRoom([kid.id as string]));
    expect(chore._status).toBe(200);
  });

  test('authenticated user can create reward', async ({ authCtx }) => {
    const reward = await trackCreated(authCtx, 'rewards', TestData.reward.screenTime());
    expect(reward._status).toBe(200);
  });

  test('authenticated user can delete entities', async ({ authCtx }) => {
    const kid = await trackCreated(authCtx, 'kids', TestData.kid.emma());

    const deleteResp = await authCtx.delete(`/api/kids/${kid.id}`);
    expect(deleteResp.ok()).toBeTruthy();

    const getResp = await authCtx.get(`/api/kids/${kid.id}`);
    expect(getResp.status()).toBe(404);

    // Already deleted — remove from tracked list so afterEach doesn't 404
    const idx = createdIds.findIndex(e => e.id === kid.id);
    if (idx !== -1) createdIds.splice(idx, 1);
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
    const kid = await trackCreated(authCtx, 'kids', TestData.kid.emma());
    const parent = await trackCreated(authCtx, 'parents', {
      ...TestData.parent.mom([kid.id as string]),
      pin: '1234',
    });
    parentId = parent.id as string;
  });

  test.afterEach(async ({ authCtx }) => {
    await cleanupTracked(authCtx);
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
  test.afterEach(async ({ authCtx }) => {
    await cleanupTracked(authCtx);
  });

  test('kid name with HTML tags is stored and retrieved safely', async ({ authCtx }) => {
    const xssName = '<script>alert("xss")</script>';
    const kid = await trackCreated(authCtx, 'kids', { name: xssName, enable_notifications: true });

    if (kid._status === 200) {
      const getResp = await authCtx.get(`/api/kids/${kid.id}`);
      const retrieved = await getResp.json();
      expect(retrieved.name).toBe(xssName);
    } else {
      expect([400, 422]).toContain(kid._status);
    }
  });

  test('chore name with HTML entities is handled correctly', async ({ authCtx }) => {
    const kid = await trackCreated(authCtx, 'kids', TestData.kid.emma());

    const htmlName = 'Clean <Room> & "Bathroom"';
    const chore = await trackCreated(authCtx, 'chores', {
      ...TestData.chore.cleanRoom([kid.id as string]),
      name: htmlName,
    });

    if (chore._status === 200) {
      const getResp = await authCtx.get(`/api/chores/${chore.id}`);
      const retrieved = await getResp.json();
      expect(retrieved.name).toBe(htmlName);
    } else {
      expect([400, 422]).toContain(chore._status);
    }
  });

  test('reward name with script payload is handled safely', async ({ authCtx }) => {
    const payload = '<img src=x onerror=alert(1)>';
    const reward = await trackCreated(authCtx, 'rewards', {
      ...TestData.reward.screenTime(),
      name: payload,
    });

    if (reward._status === 200) {
      const getResp = await authCtx.get(`/api/rewards/${reward.id}`);
      const retrieved = await getResp.json();
      expect(retrieved.name).toBe(payload);
    } else {
      expect([400, 422]).toContain(reward._status);
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
