/**
 * Automated color-contrast gate (axe-core).
 *
 * Exists because v0.10.0 shipped an INVISIBLE white-on-white Allowance balance
 * card in light theme: Playwright's toBeVisible() is layout visibility, not
 * perceivability, so all behavioral tests passed. This spec runs the axe
 * `color-contrast` rule on the main pages in BOTH themes and fails CI on
 * insufficient (or zero) text contrast.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { authenticatePage } from '../fixtures/cached-auth';

const PAGES = ['/', '/allowance', '/chores', '/rewards'];
const THEMES = ['light', 'dark'] as const;

for (const theme of THEMES) {
  for (const path of PAGES) {
    test(`no contrast violations on ${path} (${theme})`, async ({ page, playwright }) => {
      await authenticatePage(page, playwright);
      await page.goto(path);
      await page.evaluate((m) => {
        localStorage.setItem('kidschores-theme-mode', m);
      }, theme);
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(800); // let count-up animations settle

      const results = await new AxeBuilder({ page })
        .withRules(['color-contrast'])
        // decorative/animated layers axe can't reliably judge
        .exclude('[aria-hidden="true"]')
        .analyze();

      const violations = results.violations.map(v => ({
        rule: v.id,
        nodes: v.nodes.slice(0, 5).map(n => ({
          target: n.target.join(' '),
          summary: n.failureSummary?.split('\n')[1]?.trim(),
        })),
      }));

      expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
    });
  }
}
