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
  readonly kidCards: Locator;
  readonly loadingIndicator: Locator;
  readonly emptyState: Locator;
  readonly errorMessage: Locator;

  // Navigation
  readonly navHome: Locator;
  readonly navChores: Locator;
  readonly navRewards: Locator;
  readonly navAdmin: Locator;

  constructor(page: Page) {
    this.page = page;

    // Kid cards use data-testid="kid-card-{id}" or gradient backgrounds
    this.kidCards = page.locator('[data-testid^="kid-card-"], div.bg-gradient-to-br.rounded-2xl');
    this.loadingIndicator = page.getByText(/loading/i);
    this.emptyState = page.getByText(/no kids yet/i);
    this.errorMessage = page.locator('.bg-red-100, .bg-status-error');

    // Navigation links
    this.navHome = page.locator('a[href="/"]');
    this.navChores = page.locator('a[href="/chores"]');
    this.navRewards = page.locator('a[href="/rewards"]');
    this.navAdmin = page.locator('a[href="/admin"]');
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
   * Get kid name locator
   */
  getKidName(name: string): Locator {
    return this.page.locator('[data-testid^="kid-name-"], h2.text-2xl.font-bold, h2.font-bold', { hasText: name });
  }

  /**
   * Get the points displayed for a kid
   * Note: AnimatedPoints uses a spring count-up animation. A fixed sleep races
   * the animation duration (framer-motion timing shifts between versions made
   * an 800ms sleep read 99-of-100), so poll until the displayed value is
   * stable across two consecutive reads instead.
   */
  async getKidPoints(name: string): Promise<number> {
    const card = this.getKidCard(name);
    await expect(card).toBeVisible();

    const read = async (): Promise<number> => {
      // Look for the points element using data-testid first
      const pointsElement = card.locator('[data-testid^="kid-points-"], span.text-5xl.font-bold, span.text-4xl.font-bold').first();
      if (await pointsElement.count() > 0) {
        const pointsText = await pointsElement.textContent();
        return parseInt(pointsText || '0', 10);
      }
      // Fallback: look for any number followed by "points"
      const cardText = await card.textContent();
      const match = cardText?.match(/(\d+)\s*points/i);
      return match ? parseInt(match[1], 10) : 0;
    };

    // Initial settle: give the React Query refetch time to land and the
    // spring time to START before sampling (a bare stability poll returns a
    // stale pre-animation value otherwise).
    await this.page.waitForTimeout(800);

    // Then require the value to hold across THREE consecutive samples 400ms
    // apart (1.2s window) — the spring's asymptotic tail can display N-1 for
    // several hundred ms before rounding over to the final value.
    let prev = await read();
    let stableCount = 0;
    for (let i = 0; i < 30; i++) {
      await this.page.waitForTimeout(400);
      const cur = await read();
      if (cur === prev) {
        stableCount++;
        if (stableCount >= 2) return cur; // 3 identical reads spanning 1.2s
      } else {
        stableCount = 0;
        prev = cur;
      }
    }
    return prev; // ~13s ceiling — return the last read rather than hang
  }

  /**
   * Get the streak count for a kid
   */
  async getKidStreak(name: string): Promise<number> {
    const card = this.getKidCard(name);
    await expect(card).toBeVisible();

    // Look for streak indicator (fire emoji or streak text)
    const streakElement = card.locator('text=/streak/i, text=/🔥/').locator('..');
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
      // The kid name is in h2.text-2xl.font-bold
      const nameElement = card.locator('h2.text-2xl.font-bold, h2, h3').first();
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
    // Wait for network to settle first
    await this.page.waitForLoadState('networkidle');

    // Wait for either kids to appear, empty state, or loading to finish
    // The loading skeleton uses animate-pulse class
    const loadingSkeleton = this.page.locator('.animate-pulse');

    // First wait for loading to potentially finish
    try {
      await loadingSkeleton.first().waitFor({ state: 'hidden', timeout: 5000 });
    } catch {
      // Loading may have already completed
    }

    // Then wait for either kids or empty state
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

  /**
   * Navigate to chores page via nav
   */
  async goToChores(): Promise<void> {
    await this.navChores.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to rewards page via nav
   */
  async goToRewards(): Promise<void> {
    await this.navRewards.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to admin page via nav
   */
  async goToAdmin(): Promise<void> {
    await this.navAdmin.click();
    await this.page.waitForLoadState('networkidle');
  }
}
