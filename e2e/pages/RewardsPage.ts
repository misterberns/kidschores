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

  // Redeem flow elements
  readonly redeemButton: Locator;
  readonly kidPointsBar: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main elements
    this.pageTitle = page.getByText(/rewards/i).first();
    // Reward cards use .card class and have data-testid
    this.rewardCards = page.locator('.card, [data-testid^="reward-card-"]');
    this.emptyState = page.getByText(/no rewards|reward shop is empty/i);
    this.loadingIndicator = page.getByText(/loading/i);

    // Redeem flow
    this.redeemButton = page.locator('button:has-text("Get This"), button:has-text("🛒")');
    this.kidPointsBar = page.locator('div.flex.gap-2.overflow-x-auto');
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
    // Find the reward by its name in h3.font-bold
    return this.page.locator('h3.font-bold, h3[class*="font-bold"]', { hasText: name }).locator('..').locator('..');
  }

  /**
   * Get reward card from list (broader selector)
   */
  getRewardCardByText(name: string): Locator {
    return this.rewardCards.filter({ hasText: name });
  }

  /**
   * Redeem a reward for a specific kid
   */
  async redeemReward(rewardName: string, kidName: string): Promise<void> {
    const card = this.getRewardCardByText(rewardName);
    await expect(card).toBeVisible();

    // Click the Redeem button (may be "Get This!" with emoji)
    const redeemBtn = card.locator('button:has-text("Get"), button:has-text("🛒"), button:has-text("Redeem")');
    await redeemBtn.click();

    // Wait for dropdown to appear and select the kid
    await this.page.waitForTimeout(300); // Allow dropdown to render
    const kidButton = this.page.locator('div.absolute button, button.w-full.text-left', { hasText: kidName });
    await kidButton.click();

    // Wait for the redemption to be processed
    await this.page.waitForResponse(
      (resp) => resp.url().includes('/api/rewards') && resp.url().includes('/redeem'),
      { timeout: 5000 }
    ).catch(() => {
      // Response may have already completed
    });
  }

  /**
   * Get the cost (in points) of a reward
   */
  async getRewardCost(rewardName: string): Promise<number> {
    const card = this.getRewardCardByText(rewardName);
    await expect(card).toBeVisible();

    // Look for cost display (accent color or with "points" label)
    const costElement = card.locator('span[class*="text-accent"], [data-testid*="cost"], span.font-bold').first();
    if (await costElement.count() > 0) {
      const costText = await costElement.textContent();
      const match = costText?.match(/(\d+)/);
      if (match) return parseInt(match[1], 10);
    }

    // Fallback: look for number followed by "points"
    const cardText = await card.textContent();
    const match = cardText?.match(/(\d+)\s*(?:points|pts)/i);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Check if a reward is visible
   */
  async isRewardVisible(rewardName: string): Promise<boolean> {
    const card = this.getRewardCardByText(rewardName);
    return await card.isVisible();
  }

  /**
   * Get all visible reward names
   */
  async getVisibleRewardNames(): Promise<string[]> {
    const cards = await this.rewardCards.all();
    const names: string[] = [];

    for (const card of cards) {
      const nameElement = card.locator('h3.font-bold, h3[class*="font-bold"], h3[class*="font-semibold"]').first();
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

  /**
   * Check if reward shows "Need more points!" locked state
   */
  async isRewardLocked(rewardName: string): Promise<boolean> {
    const card = this.getRewardCardByText(rewardName);
    await expect(card).toBeVisible();

    const cardText = await card.textContent();
    return cardText?.toLowerCase().includes('need more points') || false;
  }

  /**
   * Check if a specific kid can redeem (button is enabled)
   */
  async canKidRedeem(rewardName: string, kidName: string): Promise<boolean> {
    const card = this.getRewardCardByText(rewardName);
    await expect(card).toBeVisible();

    // Click to open dropdown
    const redeemBtn = card.locator('button:has-text("Get"), button:has-text("🛒"), button:has-text("Redeem")');
    await redeemBtn.click();
    await this.page.waitForTimeout(300);

    // Check if kid button is enabled (not grayed out)
    const kidButton = this.page.locator('div.absolute button', { hasText: kidName });
    const isDisabled = await kidButton.getAttribute('disabled');

    // Close dropdown by clicking elsewhere
    await this.page.locator('body').click({ position: { x: 0, y: 0 } });

    return isDisabled === null;
  }
}
