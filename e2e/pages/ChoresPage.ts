import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the Chores page
 *
 * This page displays:
 * - Available chores that can be claimed
 * - Claim buttons per kid
 * - Chore status (available, claimed, pending approval)
 */
export class ChoresPage {
  readonly page: Page;

  // Page elements
  readonly pageTitle: Locator;
  readonly choreCards: Locator;
  readonly emptyState: Locator;
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main elements
    this.pageTitle = page.getByText(/chores/i).first();
    this.choreCards = page.locator('[class*="rounded-2xl"][class*="border"]').filter({
      has: page.locator('text=/points/i'),
    });
    this.emptyState = page.getByText(/no chores/i);
    this.loadingIndicator = page.getByText(/loading/i);
  }

  /**
   * Navigate to the chores page
   */
  async goto(): Promise<void> {
    await this.page.goto('/chores');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get a chore card by name
   */
  getChoreCard(name: string): Locator {
    return this.choreCards.filter({ hasText: name });
  }

  /**
   * Claim a chore for a specific kid
   */
  async claimChore(choreName: string, kidName: string): Promise<void> {
    const card = this.getChoreCard(choreName);
    await expect(card).toBeVisible();

    // Click the Claim button
    const claimButton = card.getByRole('button', { name: /claim/i });
    await claimButton.click();

    // Select the kid from the dropdown/options
    const kidButton = this.page.getByRole('button', { name: kidName });
    await kidButton.click();

    // Wait for the claim to be processed
    await this.page.waitForResponse(
      (resp) => resp.url().includes('/api/chores') && resp.url().includes('/claim')
    );
  }

  /**
   * Get the status of a chore
   */
  async getChoreStatus(choreName: string): Promise<string> {
    const card = this.getChoreCard(choreName);
    await expect(card).toBeVisible();

    // Look for status badge
    const statusBadge = card.locator('[class*="rounded-full"], [class*="badge"]');
    if (await statusBadge.count() > 0) {
      return (await statusBadge.first().textContent()) || 'unknown';
    }

    return 'available';
  }

  /**
   * Check if a chore is claimed
   */
  async isChoreClained(choreName: string): Promise<boolean> {
    const status = await this.getChoreStatus(choreName);
    return status.toLowerCase().includes('claimed') || status.toLowerCase().includes('pending');
  }

  /**
   * Get the points value for a chore
   */
  async getChorePoints(choreName: string): Promise<number> {
    const card = this.getChoreCard(choreName);
    await expect(card).toBeVisible();

    const pointsText = await card.locator('text=/\\d+\\s*points/i').textContent();
    const match = pointsText?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Check if a chore is visible
   */
  async isChoreVisible(choreName: string): Promise<boolean> {
    const card = this.getChoreCard(choreName);
    return await card.isVisible();
  }

  /**
   * Get all visible chore names
   */
  async getVisibleChoreNames(): Promise<string[]> {
    const cards = await this.choreCards.all();
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
   * Check if chores page shows empty state
   */
  async hasNoChores(): Promise<boolean> {
    return await this.emptyState.isVisible();
  }

  /**
   * Get the count of visible chore cards
   */
  async getChoreCount(): Promise<number> {
    return await this.choreCards.count();
  }

  /**
   * Wait for chores to load
   */
  async waitForChoresToLoad(): Promise<void> {
    await Promise.race([
      this.choreCards.first().waitFor({ state: 'visible', timeout: 10000 }),
      this.emptyState.waitFor({ state: 'visible', timeout: 10000 }),
    ]);
  }

  /**
   * Get assigned kids for a chore
   */
  async getAssignedKids(choreName: string): Promise<string[]> {
    const card = this.getChoreCard(choreName);
    await expect(card).toBeVisible();

    const assignedText = await card.locator('text=/assigned/i').locator('..').textContent();
    if (assignedText) {
      // Parse "Assigned: Emma, Jack" format
      const match = assignedText.match(/assigned:?\s*(.+)/i);
      if (match) {
        return match[1].split(',').map((name) => name.trim());
      }
    }

    return [];
  }
}
