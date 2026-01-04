import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the Select Kid page
 *
 * This page handles:
 * - Kid profile selection after login
 * - Continue as parent option
 * - Logout functionality
 */
export class SelectKidPage {
  readonly page: Page;

  // Page elements
  readonly kidCards: Locator;
  readonly continueAsParentButton: Locator;
  readonly logoutButton: Locator;
  readonly noKidsMessage: Locator;

  // Header elements
  readonly pageTitle: Locator;
  readonly welcomeText: Locator;

  constructor(page: Page) {
    this.page = page;

    // Kid cards - buttons within the grid that contain avatar and name
    // Structure: button > div.rounded-full (avatar) + span (name) + span (points)
    // Use the grid container to scope the selection
    this.kidCards = page.locator('.grid button').filter({ has: page.locator('.rounded-full') });

    // Continue as parent button
    this.continueAsParentButton = page.getByRole('button', { name: /continue as parent/i });

    // Logout button
    this.logoutButton = page.getByRole('button', { name: /sign out/i });

    // No kids message
    this.noKidsMessage = page.getByText(/no kids added yet/i);

    // Header
    this.pageTitle = page.getByText(/who's using kidschores/i);
    this.welcomeText = page.getByText(/welcome,/i);
  }

  /**
   * Navigate to the select kid page
   */
  async goto(): Promise<void> {
    await this.page.goto('/select-kid');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if select kid page is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.pageTitle.isVisible();
  }

  /**
   * Get all kid cards
   */
  async getKidCards(): Promise<{ name: string; points: string }[]> {
    const cards: { name: string; points: string }[] = [];
    const cardElements = await this.kidCards.all();

    for (const card of cardElements) {
      const text = await card.textContent() || '';
      // Extract name (first line) and points (X points)
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      const name = lines[0] || '';
      const pointsMatch = text.match(/(\d+)\s*points/i);
      const points = pointsMatch ? pointsMatch[1] : '0';

      if (name && !name.includes('Continue') && !name.includes('Sign out')) {
        cards.push({ name, points });
      }
    }

    return cards;
  }

  /**
   * Select a kid by name
   */
  async selectKid(name: string): Promise<void> {
    // Wait for the grid to be visible (kids loaded)
    await this.page.locator('.grid').first().waitFor({ state: 'visible', timeout: 10000 });

    // Find the kid card containing the name - look for button with matching text
    const kidCard = this.page.locator('.grid button', { hasText: name }).first();

    // Ensure the card is visible before clicking
    await kidCard.waitFor({ state: 'visible', timeout: 5000 });
    await kidCard.click();

    await this.page.waitForURL((url) => !url.pathname.includes('/select-kid'), {
      timeout: 10000,
    });
  }

  /**
   * Continue as parent (skip kid selection)
   */
  async continueAsParent(): Promise<void> {
    await this.continueAsParentButton.click();
    await this.page.waitForURL((url) => !url.pathname.includes('/select-kid'), {
      timeout: 10000,
    });
  }

  /**
   * Logout from the app
   */
  async logout(): Promise<void> {
    await this.logoutButton.click();
    await this.page.waitForURL('**/login', { timeout: 10000 });
  }

  /**
   * Check if no kids message is shown
   */
  async hasNoKids(): Promise<boolean> {
    return await this.noKidsMessage.isVisible();
  }

  /**
   * Get the welcome message (includes parent name)
   */
  async getWelcomeMessage(): Promise<string | null> {
    if (await this.welcomeText.isVisible()) {
      return await this.welcomeText.textContent();
    }
    return null;
  }

  /**
   * Get kid card by name
   */
  getKidCard(name: string): Locator {
    return this.kidCards.filter({ hasText: name });
  }

  /**
   * Wait for page to be ready
   */
  async waitForReady(): Promise<void> {
    await expect(this.pageTitle).toBeVisible({ timeout: 10000 });
  }
}

export default SelectKidPage;
