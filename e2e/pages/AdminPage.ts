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

    // Tab buttons - target by text and ensure it's in the tab navigation area (not action buttons)
    // The tabs are buttons with rounded-xl class in a horizontal flex container
    const tabContainer = page.locator('div.flex.gap-2, div.flex.gap-3').filter({ has: page.getByRole('button', { name: /Kids/i }) });
    this.tabs = {
      approvals: tabContainer.getByRole('button', { name: /Approve/i }).first(),
      kids: tabContainer.getByRole('button', { name: /Kids/i }),
      chores: tabContainer.getByRole('button', { name: /Chores/i }),
      rewards: tabContainer.getByRole('button', { name: /Rewards/i }),
      parents: tabContainer.getByRole('button', { name: /Parents/i }),
    };

    // Add buttons - dashed border style
    this.addButtons = {
      kid: page.locator('button.border-dashed:has-text("Add Kid"), button:has-text("+ Add Kid")'),
      chore: page.locator('button.border-dashed:has-text("Add Chore"), button:has-text("+ Add Chore")'),
      reward: page.locator('button.border-dashed:has-text("Add Reward"), button:has-text("+ Add Reward")'),
      parent: page.locator('button.border-dashed:has-text("Add Parent"), button:has-text("+ Add Parent")'),
    };

    // Delete confirmation modal - uses data-testid
    this.deleteConfirmModal = page.locator('[data-testid="delete-modal"]');

    // Pending approval cards - left border indicator
    this.pendingApprovalCards = page.locator('div.border-l-4.border-blue-500, div.border-l-4.border-purple-500, [class*="border-l-4"]');
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
    await this.page.locator('input[placeholder*="name" i], input[type="text"]').first().fill(name);

    // Submit - look for Add button or form submit
    await this.page.locator('button.bg-primary-500:has-text("Add"), button:has-text("Add"):not(.border-dashed)').click();

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
    await this.page.locator('input[placeholder*="name" i], input[type="text"]').first().fill(name);
    await this.page.locator('input[type="number"]').first().fill(String(points));

    if (options.description) {
      const descInput = this.page.locator('input[placeholder*="description" i], textarea');
      if ((await descInput.count()) > 0) {
        await descInput.fill(options.description);
      }
    }

    // Select assigned kids - they are rounded buttons in a flex container
    // Wait for kids to appear in the selector
    await this.page.waitForTimeout(300);
    for (const kid of assignedKids) {
      // Kid selector uses rounded-full buttons containing only the kid's name
      const kidBtn = this.page.locator('button.rounded-full.border-2', { hasText: kid });
      if ((await kidBtn.count()) > 0) {
        await kidBtn.click();
        await this.page.waitForTimeout(100); // Wait for state to update
      } else {
        // Fallback: Try any button with the kid name
        const fallbackBtn = this.page.locator(`button:has-text("${kid}")`);
        if ((await fallbackBtn.count()) > 0) {
          await fallbackBtn.click();
        }
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
    await this.page.locator('button.bg-primary-500:has-text("Add"), button:has-text("Add"):not(.border-dashed)').click();

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
    await this.page.locator('input[placeholder*="name" i], input[type="text"]').first().fill(name);
    await this.page.locator('input[type="number"]').first().fill(String(cost));

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
    await this.page.locator('button.bg-primary-500:has-text("Add"), button:has-text("Add"):not(.border-dashed)').click();

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
    await this.page.locator('input[placeholder*="name" i], input[type="text"]').first().fill(name);
    if (pin) {
      const pinInput = this.page.locator('input[placeholder*="pin" i], input[type="password"]');
      if ((await pinInput.count()) > 0) {
        await pinInput.fill(pin);
      }
    }

    // Submit
    await this.page.locator('button.bg-primary-500:has-text("Add"), button:has-text("Add"):not(.border-dashed)').click();

    // Wait for API response
    await this.page.waitForResponse((resp) => resp.url().includes('/api/parents') && resp.status() === 200);
  }

  // ============== Edit Operations ==============

  /**
   * Get an entity card by name in the current tab
   * Uses .card class which is theme-aware (works in light/dark mode)
   * Cards have data-testid="entity-{type}-{id}" format
   */
  getEntityCard(name: string): Locator {
    // Use specific card selectors to avoid matching inner elements
    return this.page.locator('[data-testid^="entity-"], .card:has(button[title="Delete"])').filter({ hasText: name }).first();
  }

  /**
   * Click edit button on an entity
   */
  async clickEdit(entityName: string): Promise<void> {
    const card = this.getEntityCard(entityName);
    await expect(card).toBeVisible();
    // Try emoji button first, then icon button
    const editBtn = card.locator('button:has-text("✏"), button[title*="edit" i], button:has-text("Edit")');
    await editBtn.click();
  }

  /**
   * Click delete button on an entity
   */
  async clickDelete(entityName: string): Promise<void> {
    const card = this.getEntityCard(entityName);
    await expect(card).toBeVisible();
    // Look for delete button by title attribute (Lucide Trash2 icon with title="Delete")
    const deleteBtn = card.locator('button[title="Delete"]').first();
    // Wait for button to be stable, then use dispatchEvent to bypass interception
    await deleteBtn.waitFor({ state: 'visible' });
    await deleteBtn.dispatchEvent('click');
  }

  /**
   * Confirm deletion in the modal
   */
  async confirmDelete(): Promise<void> {
    await expect(this.deleteConfirmModal).toBeVisible();
    // Use data-testid for reliable selection
    await this.page.locator('[data-testid="confirm-delete-btn"], button.bg-status-error:has-text("Delete"), button:has-text("Confirm")').click();
  }

  /**
   * Cancel deletion in the modal
   */
  async cancelDelete(): Promise<void> {
    await expect(this.deleteConfirmModal).toBeVisible();
    // Use data-testid for reliable selection
    await this.page.locator('[data-testid="cancel-delete-btn"], button:has-text("Cancel")').click();
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
    // Badge uses data-testid="pending-badge" and bg-accent-500 class
    const badge = this.tabs.approvals.locator('[data-testid="pending-badge"], [class*="bg-accent"]');
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
    // Look for approve button (green with checkmark)
    const approveBtn = approvalCard.first().locator('button.bg-green-500:has-text("Approve"), button:has-text("✓ Approve"), button:has-text("Approve")');
    await approveBtn.click();

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
    // Look for deny button
    const denyBtn = approvalCard.first().locator('button:has-text("✗ Deny"), button:has-text("Deny"), button:has-text("Disapprove")');
    await denyBtn.click();

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
    // Use .card class with buttons (entity cards have edit/delete buttons)
    const cards = this.page.locator('.card').filter({
      has: this.page.locator('button[title="Delete"]'),
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
    const adjustButton = card.locator('button:has-text("adjust"), button:has-text("points"), button:has-text("+")');
    if ((await adjustButton.count()) > 0) {
      await adjustButton.first().click();
      await this.page.locator('input[type="number"]').fill(String(points));
      await this.page.locator('button:has-text("Save"), button:has-text("Confirm")').click();

      // Wait for API response
      await this.page.waitForResponse((resp) => resp.url().includes('/points') && resp.status() === 200);
    }
  }

  /**
   * Get kid points from card
   */
  async getKidPoints(kidName: string): Promise<number> {
    const card = this.getEntityCard(kidName);
    await expect(card).toBeVisible();

    const cardText = await card.textContent();
    const match = cardText?.match(/(\d+)\s*(?:points|pts)/i);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Check if there are pending approvals
   */
  async hasPendingApprovals(): Promise<boolean> {
    await this.selectTab('approvals');
    const count = await this.pendingApprovalCards.count();
    return count > 0;
  }
}
