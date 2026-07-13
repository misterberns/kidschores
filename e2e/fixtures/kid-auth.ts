/**
 * Kid-session authentication for e2e tests (v0.14.1).
 *
 * There is no offline path to a real kid login (kid accounts are created
 * lazily inside the Google OAuth callback), so the dev/test-only endpoint
 * POST /api/test/kid-account mints a kid-linked User + token — the HTTP
 * analogue of backend/tests/conftest.py::make_kid_account. The token is a
 * plain {"sub": user.id}; /auth/me derives role='kid' from the DB linkage.
 *
 * NOTE: /api/test/reset deletes Kid rows but preserves Users, so a kid
 * account must be minted AFTER any reset in the test setup.
 */
import { Page } from '@playwright/test';
import { getAuthApiContext } from './cached-auth';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3103';

export interface KidSession {
  accessToken: string;
  kidId: string;
}

/** Mint a kid-linked account for an EXISTING kid (created via ApiHelpers). */
export async function createKidSession(playwright: any, kidId: string): Promise<KidSession> {
  const parentCtx = await getAuthApiContext(playwright);
  const resp = await parentCtx.post('/api/test/kid-account', { data: { kid_id: kidId } });
  if (!resp.ok()) {
    throw new Error(`POST /api/test/kid-account failed (${resp.status()}): ${await resp.text()}`);
  }
  const data = await resp.json();
  await parentCtx.dispose();
  return { accessToken: data.access_token, kidId: data.kid_id };
}

/** Inject the kid session into the browser — the page then runs role='kid'. */
export async function authenticatePageAsKid(page: Page, session: KidSession): Promise<void> {
  await page.goto(`${FRONTEND_URL}/login`);
  await page.evaluate((t) => {
    localStorage.setItem('kc_access_token', t);
    localStorage.removeItem('kc_refresh_token');
  }, session.accessToken);
  await page.goto(`${FRONTEND_URL}/`);
  await page.waitForLoadState('networkidle');
}
