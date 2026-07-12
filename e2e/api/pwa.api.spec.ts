import { test, expect } from '@playwright/test';

/**
 * PWA static control files — served correctly by nginx (v0.13.0).
 * No DB dependency; plain requests against the frontend origin.
 */
test.describe('PWA static files', () => {
  test('manifest.json serves with JSON content and install fields', async ({ request }) => {
    const resp = await request.get('/manifest.json');
    expect(resp.status()).toBe(200);
    expect(resp.headers()['content-type']).toContain('json');
    const manifest = await resp.json();
    expect(manifest.name).toBe('KidsChores');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
  });

  test('sw.js serves as javascript with revalidating cache', async ({ request }) => {
    const resp = await request.get('/sw.js');
    expect(resp.status()).toBe(200);
    expect(resp.headers()['content-type']).toContain('javascript');
    expect(resp.headers()['cache-control'] ?? '').toContain('no-cache');
  });

  test('maskable icon serves as png', async ({ request }) => {
    const resp = await request.get('/icon-512-maskable.png');
    expect(resp.status()).toBe(200);
    expect(resp.headers()['content-type']).toContain('image/png');
  });
});
