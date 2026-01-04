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

  // Claim flow elements
  readonly claimButton: Locator;
  readonly kidDropdown: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main elements
    this.pageTitle = page.getByText(/chores/i).first();
    // Chore cards use .card class and have data-testid
    this.choreCards = page.locator('.card, [data-testid^="chore-card-"]');
    this.emptyState = page.getByText(/no chores/i);
    this.loadingIndicator = page.getByText(/loading/i);

    // Claim flow
    this.claimButton = page.locator('button:has-text("Claim"), button:has-text("✋")');
    // Use theme-aware selectors - dropdown uses bg-bg-elevated class
    this.kidDropdown = page.locator('div.absolute.rounded-xl, div.absolute.shadow-xl, div.absolute.bg-bg-elevated');
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
    // Find the chore by its name in h3.font-bold
    return this.page.locator('h3.font-bold, h3[class*="font-bold"]', { hasText: name }).locator('..').locator('..');
  }

  /**
   * Get chore card from list (broader selector)
   */
  getChoreCardByText(name: string): Locator {
    return this.choreCards.filter({ hasText: name });
  }

  /**
   * Claim a chore for a specific kid
   */
  async claimChore(choreName: string, kidName: string): Promise<void> {
    const card = this.getChoreCardByText(choreName);
    await expect(card).toBeVisible();

    // Click the Claim button (may have emoji)
    const claimBtn = card.locator('button:has-text("Claim"), button:has-text("✋")');
    await claimBtn.click();

    // Wait for dropdown to animate in - it's wrapped in AnimatePresence
    await this.page.waitForTimeout(400); // Allow dropdown animation to complete

    // The dropdown appears in a div.absolute with bg-bg-elevated
    // Kid buttons are inside with class: w-full text-left px-3 py-2 rounded-lg
    const dropdown = this.page.locator('div.absolute.rounded-xl.shadow-xl');
    await expect(dropdown).toBeVisible({ timeout: 2000 });

    // Find and click the kid button
    const kidButton = dropdown.locator('button.rounded-lg', { hasText: kidName });
    await kidButton.click();

    // Wait for the claim to be processed
    await this.page.waitForResponse(
      (resp) => resp.url().includes('/api/chores') && resp.url().includes('/claim'),
      { timeout: 5000 }
    ).catch(() => {
      // Response may have already completed
    });

    // After a successful claim, the UI shows "Claimed!" animation for 2.5s
    // Then React Query refetches and updates the status
    // Wait for the "Waiting for approval" text or status badge to appear
    await this.page.waitForTimeout(3000); // Wait for animation and refetch to complete
  }

  /**
   * Get the status of a chore
   * Chore statuses in the UI:
   * - 'pending' = available to claim (yellow badge, Claim button visible)
   * - 'claimed' = claimed, waiting for approval (blue badge, shows "Waiting for approval ⏳")
   * - 'approved' = completed and approved (green badge)
   * - 'overdue' = past due (red badge)
   */
  async getChoreStatus(choreName: string): Promise<string> {
    const card = this.getChoreCardByText(choreName);
    await expect(card).toBeVisible();

    // Get full card text first and check for status indicators
    const cardText = await card.textContent();

    // Check for "Waiting for approval" which indicates claimed status
    if (cardText?.toLowerCase().includes('waiting for approval')) {
      return 'claimed';
    }

    // Look for AnimatedBadge - it's an inline-flex span with badge-* classes
    // The badge contains an icon + label text (e.g., "Claimed")
    const statusBadge = card.locator('span.inline-flex[class*="badge-"], span[class*="badge-pending"], span[class*="badge-claimed"], span[class*="badge-approved"], span[class*="badge-overdue"]');
    if ((await statusBadge.count()) > 0) {
      const badgeText = await statusBadge.first().textContent();
      if (badgeText) {
        const text = badgeText.toLowerCase().trim();
        // Badge text includes icon + label, extract the status word
        if (text.includes('claimed')) return 'claimed';
        if (text.includes('pending')) return 'pending';
        if (text.includes('approved')) return 'approved';
        if (text.includes('overdue')) return 'overdue';
        return text;
      }
    }

    // Fallback: Check class-based indicators
    if (await card.locator('[class*="badge-claimed"]').count() > 0) {
      return 'claimed';
    }
    if (await card.locator('[class*="badge-approved"]').count() > 0) {
      return 'approved';
    }
    if (await card.locator('[class*="badge-overdue"]').count() > 0) {
      return 'overdue';
    }

    return 'pending'; // Default: available to claim
  }

  /**
   * Check if a chore is claimed (waiting for approval)
   */
  async isChoreClaimed(choreName: string): Promise<boolean> {
    const status = await this.getChoreStatus(choreName);
    // Only 'claimed' status means the chore has been claimed and is awaiting approval
    return status === 'claimed';
  }

  /**
   * Get the points value for a chore
   */
  async getChorePoints(choreName: string): Promise<number> {
    const card = this.getChoreCardByText(choreName);
    await expect(card).toBeVisible();

    const cardText = await card.textContent();
    const match = cardText?.match(/(\d+)\s*(?:points|pts)/i);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Check if a chore is visible
   */
  async isChoreVisible(choreName: string): Promise<boolean> {
    const card = this.getChoreCardByText(choreName);
    return await card.isVisible();
  }

  /**
   * Get all visible chore names
   */
  async getVisibleChoreNames(): Promise<string[]> {
    const cards = await this.choreCards.all();
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
   * In the UI, assigned kid names are shown in a <p class="text-sm text-gray-600">
   * as comma-separated names directly under the chore name
   */
  async getAssignedKids(choreName: string): Promise<string[]> {
    const card = this.getChoreCardByText(choreName);
    await expect(card).toBeVisible();

    // The assigned kids are shown in p.text-sm with muted text color
    const assignedElement = card.locator('p.text-sm, p[class*="text-text-muted"], p[class*="text-text-secondary"]').first();
    if ((await assignedElement.count()) > 0) {
      const text = await assignedElement.textContent();
      if (text) {
        // Split by comma and trim whitespace
        return text.split(',').map((name) => name.trim()).filter((name) => name.length > 0);
      }
    }

    return [];
  }

  /**
   * Check if chore is pending approval
   */
  async isPendingApproval(choreName: string): Promise<boolean> {
    const status = await this.getChoreStatus(choreName);
    return status === 'pending';
  }
}
