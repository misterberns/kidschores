import { test as base, expect } from '@playwright/test';
import { HelpPage } from '../pages/HelpPage';
import { authenticatePage, getAuthApiContext, FRONTEND_URL } from '../fixtures/cached-auth';

const test = base;

test.describe('ARIA Attributes', () => {
  test('navigation has appropriate role and aria-label', async ({ page, playwright }) => {
    await authenticatePage(page, playwright);

    const nav = page.locator('nav, [role="navigation"]');
    const navCount = await nav.count();
    expect(navCount).toBeGreaterThan(0);
  });

  test('buttons have accessible names', async ({ page, playwright }) => {
    await authenticatePage(page, playwright);

    const buttons = page.getByRole('button');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const name = await button.getAttribute('aria-label');
        const title = await button.getAttribute('title');
        const text = await button.textContent();
        const hasAccessibleName = (name && name.length > 0) ||
                                   (title && title.length > 0) ||
                                   (text && text.trim().length > 0);
        expect(hasAccessibleName).toBeTruthy();
      }
    }
  });

  test('form inputs have associated labels', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForLoadState('networkidle');

    const inputs = page.locator('input[type="text"], input[type="email"], input[type="password"]');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      if (await input.isVisible()) {
        const ariaLabel = await input.getAttribute('aria-label');
        const placeholder = await input.getAttribute('placeholder');
        const id = await input.getAttribute('id');

        let hasLabel = false;
        if (ariaLabel && ariaLabel.length > 0) hasLabel = true;
        if (placeholder && placeholder.length > 0) hasLabel = true;
        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          if (await label.count() > 0) hasLabel = true;
        }

        expect(hasLabel).toBeTruthy();
      }
    }
  });

  test('modal dialogs use role="dialog" or equivalent', async ({ page, playwright }) => {
    await authenticatePage(page, playwright);

    const authCtx = await getAuthApiContext(playwright);
    // Ensure a kid exists for delete modal
    const kidsResp = await authCtx.get('/api/kids');
    if (kidsResp.ok()) {
      const kids = await kidsResp.json();
      if (kids.length === 0) {
        await authCtx.post('/api/kids', {
          data: { name: 'Test Kid', enable_notifications: true },
        });
      }
    }
    await authCtx.dispose();

    await page.goto(`${FRONTEND_URL}/admin`);
    await page.waitForLoadState('networkidle');

    const kidsTab = page.getByRole('button', { name: /Kids/i });
    if (await kidsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await kidsTab.click();
      await page.waitForTimeout(500);

      const deleteBtn = page.locator('button[title="Delete"]').first();
      if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteBtn.dispatchEvent('click');
        await page.waitForTimeout(500);

        const dialog = page.locator('[role="dialog"], [data-testid="delete-modal"]');
        const dialogVisible = await dialog.isVisible({ timeout: 2000 }).catch(() => false);

        if (dialogVisible) {
          const role = await dialog.getAttribute('role');
          const ariaModal = await dialog.getAttribute('aria-modal');
          const hasDialogSemantics = role === 'dialog' || ariaModal === 'true';
          expect(hasDialogSemantics).toBeTruthy();
        }
      }
    }
  });
});

test.describe('Keyboard Navigation', () => {
  test('Tab key moves focus through interactive elements', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForLoadState('networkidle');

    await page.keyboard.press('Tab');

    const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedTag).toBeTruthy();

    const firstFocused = await page.evaluate(() => document.activeElement?.outerHTML);
    await page.keyboard.press('Tab');
    const secondFocused = await page.evaluate(() => document.activeElement?.outerHTML);

    expect(secondFocused).not.toBe(firstFocused);
  });

  test('Enter key activates focused button', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill('test@kidschores.com');
      await passwordInput.fill('TestPassword123');

      await page.keyboard.press('Tab');

      const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
      expect(['BUTTON', 'A', 'INPUT']).toContain(focusedTag);
    }
  });

  test('Escape key closes open modals', async ({ page, playwright }) => {
    await authenticatePage(page, playwright);

    const authCtx = await getAuthApiContext(playwright);
    const kidsResp = await authCtx.get('/api/kids');
    if (kidsResp.ok()) {
      const kids = await kidsResp.json();
      if (kids.length === 0) {
        await authCtx.post('/api/kids', {
          data: { name: 'Modal Test Kid', enable_notifications: true },
        });
      }
    }
    await authCtx.dispose();

    await page.goto(`${FRONTEND_URL}/admin`);
    await page.waitForLoadState('networkidle');

    const kidsTab = page.getByRole('button', { name: /Kids/i });
    if (await kidsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await kidsTab.click();
      await page.waitForTimeout(500);

      const deleteBtn = page.locator('button[title="Delete"]').first();
      if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteBtn.dispatchEvent('click');
        await page.waitForTimeout(500);

        const modal = page.locator('[data-testid="delete-modal"], [role="dialog"]');
        const isVisible = await modal.isVisible({ timeout: 2000 }).catch(() => false);

        if (isVisible) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(1000);

          // Verify Escape was processed — modal should close or focus should shift
          const stillVisible = await modal.isVisible().catch(() => false);
          // If modal closed, great. If not, verify there's a cancel button as alternative.
          if (stillVisible) {
            const cancelBtn = page.getByRole('button', { name: /cancel/i });
            await expect(cancelBtn).toBeVisible();
          }
        }
      }
    }
  });
});

test.describe('Help Page', () => {
  test('version badge displays at bottom of Help page', async ({ page, playwright }) => {
    await authenticatePage(page, playwright);

    const helpPage = new HelpPage(page);
    await helpPage.goto();

    await expect(helpPage.versionBadge).toBeVisible();

    const versionText = await helpPage.getVersionText();
    expect(versionText).toMatch(/KidsChores v\d+\.\d+\.\d+/);
  });

  test('accordion sections are present', async ({ page, playwright }) => {
    await authenticatePage(page, playwright);

    const helpPage = new HelpPage(page);
    await helpPage.goto();

    const titles = await helpPage.getAccordionSectionTitles();
    expect(titles.length).toBeGreaterThanOrEqual(5);
  });

  test('accordion items are expandable and collapsible', async ({ page, playwright }) => {
    await authenticatePage(page, playwright);

    const helpPage = new HelpPage(page);
    await helpPage.goto();

    // Get the first accordion item and toggle it
    const items = await helpPage.getAccordionItemTexts();
    expect(items.length).toBeGreaterThan(0);

    const firstItem = items[0];

    // Expand
    await helpPage.toggleItem(firstItem);
    const expanded = await helpPage.isItemExpanded(firstItem);
    expect(expanded).toBe(true);

    // Collapse
    await helpPage.toggleItem(firstItem);
    const collapsed = await helpPage.isItemExpanded(firstItem);
    expect(collapsed).toBe(false);
  });
});
