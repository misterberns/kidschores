import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for the Help / Parent Guide page
 *
 * Structure:
 *   AccordionSection (h3 title, not clickable)
 *     AccordionItem (button with aria-expanded, clickable)
 */
export class HelpPage {
  readonly page: Page;

  readonly pageTitle: Locator;
  readonly backToAdminLink: Locator;
  readonly versionBadge: Locator;
  /** h3 section headings (not clickable) */
  readonly accordionSections: Locator;
  /** Clickable FAQ item buttons with aria-expanded */
  readonly accordionItems: Locator;

  constructor(page: Page) {
    this.page = page;

    this.pageTitle = page.getByRole('heading', { name: /Parent Guide/i });
    this.backToAdminLink = page.getByRole('link', { name: /Back to Admin/i });
    this.versionBadge = page.locator('.font-mono').filter({ hasText: 'KidsChores v' });
    // Section titles are h3 elements
    this.accordionSections = page.locator('h3').filter({ hasText: /Getting Started|Managing Chores|Approvals & Points|Allowance System|Rewards/i });
    // Accordion items are buttons with aria-expanded
    this.accordionItems = page.locator('button[aria-expanded]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/help');
    await this.page.waitForLoadState('networkidle');
  }

  async getVersionText(): Promise<string | null> {
    return this.versionBadge.textContent();
  }

  async getAccordionSectionTitles(): Promise<string[]> {
    const count = await this.accordionSections.count();
    const titles: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await this.accordionSections.nth(i).textContent();
      if (text) titles.push(text.trim());
    }
    return titles;
  }

  /**
   * Click an AccordionItem button by its question text
   */
  async toggleItem(questionText: string): Promise<void> {
    const item = this.accordionItems.filter({ hasText: questionText });
    await item.click();
    await this.page.waitForTimeout(300);
  }

  async isItemExpanded(questionText: string): Promise<boolean> {
    const item = this.accordionItems.filter({ hasText: questionText });
    const ariaExpanded = await item.getAttribute('aria-expanded');
    return ariaExpanded === 'true';
  }

  async getAccordionItemTexts(): Promise<string[]> {
    const count = await this.accordionItems.count();
    const questions: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await this.accordionItems.nth(i).textContent();
      if (text) questions.push(text.trim());
    }
    return questions;
  }
}
