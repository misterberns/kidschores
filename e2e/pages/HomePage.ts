import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the Home page (Kids Dashboard)
 *
 * This page displays:
 * - Kid cards with points, streaks, and badges
 * - Daily/weekly/monthly completion stats
 * - Badge displays
 */
export class HomePage {
  readonly page: Page;

  // Page elements
  readonly welcomeHeading: Locator;
  readonly kidCards: Locator;
  readonly loadingIndicator: Locator;
  readonly emptyState: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main elements
    this.welcomeHeading = page.getByText('Welcome back!');
    this.kidCards = page.locator('[class*="bg-gradient-to-br"]').filter({ has: page.locator('text=/points/i') });
    this.loadingIndicator = page.getByText(/loading/i);
    this.emptyState = page.getByText(/no kids yet/i);
    this.errorMessage = page.locator('.bg-red-100');
  }

  /**
   * Navigate to the home page
   */
  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get a kid card by name
   */
  getKidCard(name: string): Locator {
    return this.kidCards.filter({ hasText: name });
  }

  /**
   * Get the points displayed for a kid
   */
  async getKidPoints(name: string): Promise<number> {
    const card = this.getKidCard(name);
    await expect(card).toBeVisible();

    // Look for the points value (large number before "points" text)
    const pointsText = await card.locator('text=/\\d+/').first().textContent();
    return parseInt(pointsText || '0', 10);
  }

  /**
   * Get the streak count for a kid
   */
  async getKidStreak(name: string): Promise<number> {
    const card = this.getKidCard(name);
    await expect(card).toBeVisible();

    // Look for streak indicator
    const streakElement = card.locator('text=/streak/i').locator('..');
    if (await streakElement.count() > 0) {
      const text = await streakElement.textContent();
      const match = text?.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    }
    return 0;
  }

  /**
   * Get the completed chores count for today
   */
  async getTodayCompletedCount(name: string): Promise<number> {
    const card = this.getKidCard(name);
    await expect(card).toBeVisible();

    const todayElement = card.locator('text=/today/i').locator('..');
    if (await todayElement.count() > 0) {
      const text = await todayElement.textContent();
      const match = text?.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    }
    return 0;
  }

  /**
   * Check if a kid card is visible
   */
  async isKidVisible(name: string): Promise<boolean> {
    const card = this.getKidCard(name);
    return await card.isVisible();
  }

  /**
   * Get all visible kid names
   */
  async getVisibleKidNames(): Promise<string[]> {
    const cards = await this.kidCards.all();
    const names: string[] = [];

    for (const card of cards) {
      // The kid name is typically in the first heading or prominent text
      const nameElement = card.locator('h2, h3, [class*="font-bold"]').first();
      const name = await nameElement.textContent();
      if (name) {
        names.push(name.trim());
      }
    }

    return names;
  }

  /**
   * Wait for kids to load
   */
  async waitForKidsToLoad(): Promise<void> {
    // Wait for either kids to appear or empty state
    await Promise.race([
      this.kidCards.first().waitFor({ state: 'visible', timeout: 10000 }),
      this.emptyState.waitFor({ state: 'visible', timeout: 10000 }),
    ]);
  }

  /**
   * Check if the page shows empty state (no kids)
   */
  async hasNoKids(): Promise<boolean> {
    return await this.emptyState.isVisible();
  }

  /**
   * Get the count of visible kid cards
   */
  async getKidCount(): Promise<number> {
    return await this.kidCards.count();
  }
}
