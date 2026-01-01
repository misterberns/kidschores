import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the Rewards page
 *
 * This page displays:
 * - Available rewards that can be redeemed
 * - Point costs for each reward
 * - Redeem buttons
 */
export class RewardsPage {
  readonly page: Page;

  // Page elements
  readonly pageTitle: Locator;
  readonly rewardCards: Locator;
  readonly emptyState: Locator;
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main elements
    this.pageTitle = page.getByText(/rewards/i).first();
    this.rewardCards = page.locator('[class*="rounded-2xl"][class*="border"]').filter({
      has: page.locator('text=/points/i'),
    });
    this.emptyState = page.getByText(/no rewards/i);
    this.loadingIndicator = page.getByText(/loading/i);
  }

  /**
   * Navigate to the rewards page
   */
  async goto(): Promise<void> {
    await this.page.goto('/rewards');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get a reward card by name
   */
  getRewardCard(name: string): Locator {
    return this.rewardCards.filter({ hasText: name });
  }

  /**
   * Redeem a reward for a specific kid
   */
  async redeemReward(rewardName: string, kidName: string): Promise<void> {
    const card = this.getRewardCard(rewardName);
    await expect(card).toBeVisible();

    // Click the Redeem button
    const redeemButton = card.getByRole('button', { name: /redeem/i });
    await redeemButton.click();

    // Select the kid from the options
    const kidButton = this.page.getByRole('button', { name: kidName });
    await kidButton.click();

    // Wait for the redemption to be processed
    await this.page.waitForResponse(
      (resp) => resp.url().includes('/api/rewards') && resp.url().includes('/redeem')
    );
  }

  /**
   * Get the cost (in points) of a reward
   */
  async getRewardCost(rewardName: string): Promise<number> {
    const card = this.getRewardCard(rewardName);
    await expect(card).toBeVisible();

    const costText = await card.locator('text=/\\d+\\s*points/i').textContent();
    const match = costText?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Check if a reward is visible
   */
  async isRewardVisible(rewardName: string): Promise<boolean> {
    const card = this.getRewardCard(rewardName);
    return await card.isVisible();
  }

  /**
   * Get all visible reward names
   */
  async getVisibleRewardNames(): Promise<string[]> {
    const cards = await this.rewardCards.all();
    const names: string[] = [];

    for (const card of cards) {
      const nameElement = card.locator('h3, [class*="font-bold"], [class*="font-semibold"]').first();
      const name = await nameElement.textContent();
      if (name) {
        names.push(name.trim());
      }
    }

    return names;
  }

  /**
   * Check if rewards page shows empty state
   */
  async hasNoRewards(): Promise<boolean> {
    return await this.emptyState.isVisible();
  }

  /**
   * Get the count of visible reward cards
   */
  async getRewardCount(): Promise<number> {
    return await this.rewardCards.count();
  }

  /**
   * Wait for rewards to load
   */
  async waitForRewardsToLoad(): Promise<void> {
    await Promise.race([
      this.rewardCards.first().waitFor({ state: 'visible', timeout: 10000 }),
      this.emptyState.waitFor({ state: 'visible', timeout: 10000 }),
    ]);
  }

  /**
   * Check if a kid can afford a reward (has enough points)
   */
  async canKidAfford(rewardName: string, kidPoints: number): Promise<boolean> {
    const cost = await this.getRewardCost(rewardName);
    return kidPoints >= cost;
  }
}
