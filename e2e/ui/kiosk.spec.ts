import { test, expect, APIRequestContext } from '@playwright/test';
import { ApiHelpers } from '../fixtures/api-helpers';
import { getAuthApiContext, authenticatePage, API_URL, FRONTEND_URL } from '../fixtures/cached-auth';

/**
 * Kiosk / shared-tablet mode (v0.18.0).
 *
 * Contract: a parent starts a kiosk from the dashboard and the browser lands on the
 * board signed OUT of the parent session; a kid picks their name and claims a chore;
 * the kiosk token is refused by the main API. Everything created here is removed.
 */
const RUN = Date.now().toString(36);
const KID_NAME = `Kiosk-${RUN}`;
const CHORE_NAME = `KioskChore-${RUN}`;
const DEVICE_NAME = `e2e-tablet-${RUN}`;

let parentCtx: APIRequestContext;
let kidId: string;
let choreId: string;
let kioskToken: string;

test.describe('Kiosk mode', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ playwright }) => {
    parentCtx = await getAuthApiContext(playwright);
    const api = new ApiHelpers(parentCtx);
    kidId = (await api.createKid({ name: KID_NAME })).id;
    choreId = (await api.createChore({
      name: CHORE_NAME,
      icon: 'broom',
      default_points: 7,
      assigned_kids: [kidId],
      recurring_frequency: 'daily',
    })).id;
    const res = await parentCtx.post('/api/kiosk/devices', { data: { name: `${DEVICE_NAME}-api` } });
    expect(res.status()).toBe(200);
    kioskToken = (await res.json()).token;
  });

  test.afterAll(async () => {
    const devices = await (await parentCtx.get('/api/kiosk/devices')).json();
    for (const d of devices as { id: string; name: string }[]) {
      if (d.name.startsWith(DEVICE_NAME)) await parentCtx.delete(`/api/kiosk/devices/${d.id}`);
    }
    await parentCtx.delete(`/api/chores/${choreId}`);
    await parentCtx.delete(`/api/kids/${kidId}`);
    await parentCtx.dispose();
  });

  test('the kiosk token is refused outside /api/kiosk', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
      baseURL: API_URL,
      extraHTTPHeaders: { Authorization: `Bearer ${kioskToken}` },
      ignoreHTTPSErrors: true,
    });
    expect((await ctx.get('/api/kiosk/state')).status()).toBe(200);
    expect((await ctx.get('/api/kids')).status()).toBe(401);
    expect((await ctx.get('/api/auth/me')).status()).toBe(401);
    expect((await ctx.post(`/api/chores/${choreId}/approve`, { data: { kid_id: kidId } })).status()).toBe(401);
    await ctx.dispose();
  });

  test('a kid picks their name, claims a chore and sees it waiting', async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('kc_kiosk_token', t), kioskToken);
    await page.goto(`${FRONTEND_URL}/kiosk`);

    await page.getByTestId(`kiosk-kid-${kidId}`).click();
    await expect(page.getByText(`${KID_NAME}’s chores`)).toBeVisible();
    await page.getByTestId(`kiosk-chore-${choreId}`).click();
    await expect(page.getByTestId('kiosk-celebration')).toContainText(`Nice work, ${KID_NAME}!`);

    // The claim is real: the main API sees it, and the tile is no longer a button.
    const today = await (await parentCtx.get(`/api/chores/today/${kidId}`)).json();
    expect(today.find((c: { id: string }) => c.id === choreId).status).toBe('claimed');
    await expect(page.getByTestId(`kiosk-chore-${choreId}`)).toContainText('Waiting for a parent');
  });

  test('a parent starts a kiosk from the dashboard and is signed out on that device', async ({ page, playwright }) => {
    await authenticatePage(page, playwright);
    await page.goto(`${FRONTEND_URL}/admin`);
    await page.getByTestId('tab-kiosk').click();
    await page.getByLabel('Device name').fill(`${DEVICE_NAME}-ui`);
    await page.getByTestId('start-kiosk-btn').click();

    await expect(page).toHaveURL(/\/kiosk$/);
    await expect(page.getByText('Who’s doing chores?')).toBeVisible();
    await expect(page.getByTestId(`kiosk-kid-${kidId}`)).toBeVisible();
    // No parent session left behind on the shared tablet.
    expect(await page.evaluate(() => localStorage.getItem('kc_access_token'))).toBeNull();

    // A signed-out kiosk tablet sent to an app path goes back to the board.
    await page.goto(`${FRONTEND_URL}/rewards`);
    await expect(page).toHaveURL(/\/kiosk$/);
  });
});
