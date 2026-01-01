import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the Admin page (Parent Dashboard)
 *
 * This page provides:
 * - Pending approvals for chores and rewards
 * - CRUD management for Kids, Chores, Rewards, Parents
 * - Points adjustment
 */
export class AdminPage {
  readonly page: Page;

  // Page elements
  readonly pageTitle: Locator;
  readonly tabs: {
    approvals: Locator;
    kids: Locator;
    chores: Locator;
    rewards: Locator;
    parents: Locator;
  };
  readonly addButtons: {
    kid: Locator;
    chore: Locator;
    reward: Locator;
    parent: Locator;
  };
  readonly deleteConfirmModal: Locator;
  readonly pendingApprovalCards: Locator;

  constructor(page: Page) {
    this.page = page;

    // Page title
    this.pageTitle = page.getByText(/parent dashboard|admin/i);

    // Tab buttons
    this.tabs = {
      approvals: page.getByRole('button', { name: /approve|pending/i }),
      kids: page.getByRole('button', { name: /kids/i }),
      chores: page.getByRole('button', { name: /chores/i }),
      rewards: page.getByRole('button', { name: /rewards/i }),
      parents: page.getByRole('button', { name: /parents/i }),
    };

    // Add buttons
    this.addButtons = {
      kid: page.getByRole('button', { name: /add kid/i }),
      chore: page.getByRole('button', { name: /add chore/i }),
      reward: page.getByRole('button', { name: /add reward/i }),
      parent: page.getByRole('button', { name: /add parent/i }),
    };

    // Delete confirmation modal
    this.deleteConfirmModal = page.locator('[class*="fixed inset-0"]').filter({
      hasText: /delete|confirm/i,
    });

    // Pending approval cards
    this.pendingApprovalCards = page.locator('[class*="border-l-4"]');
  }

  /**
   * Navigate to the admin page
   */
  async goto(): Promise<void> {
    await this.page.goto('/admin');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Select a tab
   */
  async selectTab(tab: 'approvals' | 'kids' | 'chores' | 'rewards' | 'parents'): Promise<void> {
    await this.tabs[tab].click();
    await this.page.waitForTimeout(300); // Wait for tab content to load
  }

  // ============== Add Operations ==============

  /**
   * Add a new kid
   */
  async addKid(name: string): Promise<void> {
    await this.selectTab('kids');
    await this.addButtons.kid.click();

    // Fill the form
    await this.page.fill('input[placeholder*="name" i]', name);

    // Submit
    await this.page.getByRole('button', { name: /^add$/i }).click();

    // Wait for API response
    await this.page.waitForResponse((resp) => resp.url().includes('/api/kids') && resp.status() === 200);
  }

  /**
   * Add a new chore
   */
  async addChore(
    name: string,
    points: number,
    assignedKids: string[] = [],
    options: {
      recurring?: string;
      description?: string;
    } = {}
  ): Promise<void> {
    await this.selectTab('chores');
    await this.addButtons.chore.click();

    // Fill the form
    await this.page.fill('input[placeholder*="name" i]', name);
    await this.page.fill('input[type="number"]', String(points));

    if (options.description) {
      const descInput = this.page.locator('input[placeholder*="description" i], textarea');
      if ((await descInput.count()) > 0) {
        await descInput.fill(options.description);
      }
    }

    // Select assigned kids
    for (const kid of assignedKids) {
      const kidCheckbox = this.page.locator(`label:has-text("${kid}") input[type="checkbox"]`);
      if ((await kidCheckbox.count()) > 0) {
        await kidCheckbox.check();
      } else {
        // Try button-based selection
        await this.page.getByRole('button', { name: kid }).click();
      }
    }

    // Set recurring frequency if specified
    if (options.recurring) {
      const recurringSelect = this.page.locator('select').filter({ hasText: /frequency|recurring/i });
      if ((await recurringSelect.count()) > 0) {
        await recurringSelect.selectOption(options.recurring);
      }
    }

    // Submit
    await this.page.getByRole('button', { name: /^add$/i }).click();

    // Wait for API response
    await this.page.waitForResponse((resp) => resp.url().includes('/api/chores') && resp.status() === 200);
  }

  /**
   * Add a new reward
   */
  async addReward(name: string, cost: number, requiresApproval = true): Promise<void> {
    await this.selectTab('rewards');
    await this.addButtons.reward.click();

    // Fill the form
    await this.page.fill('input[placeholder*="name" i]', name);
    await this.page.fill('input[type="number"]', String(cost));

    // Set approval requirement
    const approvalCheckbox = this.page.locator('input[type="checkbox"]').filter({
      hasText: /approval/i,
    });
    if ((await approvalCheckbox.count()) > 0) {
      if (requiresApproval) {
        await approvalCheckbox.check();
      } else {
        await approvalCheckbox.uncheck();
      }
    }

    // Submit
    await this.page.getByRole('button', { name: /^add$/i }).click();

    // Wait for API response
    await this.page.waitForResponse((resp) => resp.url().includes('/api/rewards') && resp.status() === 200);
  }

  /**
   * Add a new parent
   */
  async addParent(name: string, pin?: string): Promise<void> {
    await this.selectTab('parents');
    await this.addButtons.parent.click();

    // Fill the form
    await this.page.fill('input[placeholder*="name" i]', name);
    if (pin) {
      const pinInput = this.page.locator('input[placeholder*="pin" i], input[type="password"]');
      if ((await pinInput.count()) > 0) {
        await pinInput.fill(pin);
      }
    }

    // Submit
    await this.page.getByRole('button', { name: /^add$/i }).click();

    // Wait for API response
    await this.page.waitForResponse((resp) => resp.url().includes('/api/parents') && resp.status() === 200);
  }

  // ============== Edit Operations ==============

  /**
   * Get an entity card by name in the current tab
   */
  getEntityCard(name: string): Locator {
    return this.page.locator('[class*="bg-white"][class*="rounded"]').filter({ hasText: name });
  }

  /**
   * Click edit button on an entity
   */
  async clickEdit(entityName: string): Promise<void> {
    const card = this.getEntityCard(entityName);
    await expect(card).toBeVisible();
    await card.getByTitle(/edit/i).or(card.locator('button:has-text("✏️")')).click();
  }

  /**
   * Click delete button on an entity
   */
  async clickDelete(entityName: string): Promise<void> {
    const card = this.getEntityCard(entityName);
    await expect(card).toBeVisible();
    await card.getByTitle(/delete/i).or(card.locator('button:has-text("🗑️")')).click();
  }

  /**
   * Confirm deletion in the modal
   */
  async confirmDelete(): Promise<void> {
    await expect(this.deleteConfirmModal).toBeVisible();
    await this.page.getByRole('button', { name: /^delete$/i }).click();
  }

  /**
   * Cancel deletion in the modal
   */
  async cancelDelete(): Promise<void> {
    await expect(this.deleteConfirmModal).toBeVisible();
    await this.page.getByRole('button', { name: /cancel/i }).click();
  }

  /**
   * Delete an entity with confirmation
   */
  async deleteEntity(entityName: string): Promise<void> {
    await this.clickDelete(entityName);
    await this.confirmDelete();
  }

  // ============== Approval Operations ==============

  /**
   * Get pending approval count from badge
   */
  async getPendingApprovalCount(): Promise<number> {
    const badge = this.tabs.approvals.locator('[class*="bg-red"]');
    if ((await badge.count()) > 0) {
      const text = await badge.textContent();
      return parseInt(text || '0', 10);
    }
    return 0;
  }

  /**
   * Approve a pending chore claim
   */
  async approveChore(kidName: string, choreName?: string): Promise<void> {
    await this.selectTab('approvals');

    // Find the approval card for this kid/chore
    let approvalCard: Locator;
    if (choreName) {
      approvalCard = this.pendingApprovalCards.filter({ hasText: kidName }).filter({ hasText: choreName });
    } else {
      approvalCard = this.pendingApprovalCards.filter({ hasText: kidName });
    }

    await expect(approvalCard.first()).toBeVisible();
    await approvalCard.first().getByRole('button', { name: /approve/i }).click();

    // Wait for approval to process
    await this.page.waitForResponse((resp) => resp.url().includes('/approve') && resp.status() === 200);
  }

  /**
   * Disapprove a pending chore claim
   */
  async disapproveChore(kidName: string, choreName?: string): Promise<void> {
    await this.selectTab('approvals');

    let approvalCard: Locator;
    if (choreName) {
      approvalCard = this.pendingApprovalCards.filter({ hasText: kidName }).filter({ hasText: choreName });
    } else {
      approvalCard = this.pendingApprovalCards.filter({ hasText: kidName });
    }

    await expect(approvalCard.first()).toBeVisible();
    await approvalCard.first().getByRole('button', { name: /disapprove|reject/i }).click();

    // Wait for disapproval to process
    await this.page.waitForResponse((resp) => resp.url().includes('/disapprove') && resp.status() === 200);
  }

  // ============== Utility Methods ==============

  /**
   * Check if an entity exists in the current tab
   */
  async entityExists(name: string): Promise<boolean> {
    const card = this.getEntityCard(name);
    return await card.isVisible();
  }

  /**
   * Get count of entities in current tab
   */
  async getEntityCount(): Promise<number> {
    const cards = this.page.locator('[class*="bg-white"][class*="rounded"]').filter({
      has: this.page.locator('button'),
    });
    return await cards.count();
  }

  /**
   * Adjust points for a kid
   */
  async adjustKidPoints(kidName: string, points: number): Promise<void> {
    await this.selectTab('kids');
    const card = this.getEntityCard(kidName);
    await expect(card).toBeVisible();

    // Look for points adjustment button/input
    const adjustButton = card.getByRole('button', { name: /adjust|points/i });
    if ((await adjustButton.count()) > 0) {
      await adjustButton.click();
      await this.page.fill('input[type="number"]', String(points));
      await this.page.getByRole('button', { name: /save|confirm/i }).click();

      // Wait for API response
      await this.page.waitForResponse((resp) => resp.url().includes('/points') && resp.status() === 200);
    }
  }
}
