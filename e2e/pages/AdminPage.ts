import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the Admin page (Parent Dashboard)
 *
 * Selectors use the app's stable `data-testid`s (see frontend `Admin.tsx`,
 * `KidsSection`/`ChoresSection`/`RewardsSection`/`ParentsSection`, `EntityCard`,
 * `ApprovalsList`, `DeleteConfirmModal`) rather than styling classes.
 */
export class AdminPage {
  readonly page: Page;

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

    this.pageTitle = page.getByText(/parent dashboard|admin/i);

    // Tabs render as `<button data-testid="tab-${id}">` (Admin.tsx)
    this.tabs = {
      approvals: page.getByTestId('tab-approvals'),
      kids: page.getByTestId('tab-kids'),
      chores: page.getByTestId('tab-chores'),
      rewards: page.getByTestId('tab-rewards'),
      parents: page.getByTestId('tab-parents'),
    };

    // Section add-buttons carry stable testids
    this.addButtons = {
      kid: page.getByTestId('add-kid-btn'),
      chore: page.getByTestId('add-chore-btn'),
      reward: page.getByTestId('add-reward-btn'),
      parent: page.getByTestId('add-parent-btn'),
    };

    this.deleteConfirmModal = page.getByTestId('delete-modal');

    // Approval cards: `approval-chore-${choreId}` / `approval-reward-${rewardId}` (ApprovalsList)
    this.pendingApprovalCards = page.locator('[data-testid^="approval-"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin');
    await this.page.waitForLoadState('networkidle');
  }

  /** The form's submit button ("Add" while idle, "Adding..." while pending). */
  private submitAddButton(): Locator {
    return this.page.getByRole('button', { name: /^(Add|Adding\.\.\.)$/ });
  }

  async selectTab(tab: 'approvals' | 'kids' | 'chores' | 'rewards' | 'parents'): Promise<void> {
    await this.tabs[tab].click();
    await this.page.waitForTimeout(300); // tab content transition
  }

  // ============== Add Operations ==============

  async addKid(name: string): Promise<void> {
    await this.selectTab('kids');
    await this.addButtons.kid.click();

    await this.page.getByPlaceholder(/kid's name/i).fill(name);

    // Register the response listener BEFORE the click (avoid a fast-POST race).
    await Promise.all([
      this.page.waitForResponse(
        (resp) => resp.request().method() === 'POST' && resp.url().includes('/api/kids') && resp.ok()
      ),
      this.submitAddButton().click(),
    ]);
  }

  async addChore(
    name: string,
    points: number,
    assignedKids: string[] = [],
    options: { recurring?: string; description?: string } = {}
  ): Promise<void> {
    await this.selectTab('chores');
    await this.addButtons.chore.click();

    await this.page.getByPlaceholder(/clean room/i).fill(name);
    await this.page.locator('input[type="number"]').first().fill(String(points));

    if (options.description) {
      const descInput = this.page.locator('input[placeholder*="description" i], textarea');
      if ((await descInput.count()) > 0) await descInput.first().fill(options.description);
    }

    // Kid toggles are pill buttons (`rounded-full`) labelled with the kid name.
    for (const kid of assignedKids) {
      const kidBtn = this.page.locator('button.rounded-full', { hasText: kid }).first();
      await kidBtn.click();
      await this.page.waitForTimeout(100);
    }

    if (options.recurring) {
      const recurringSelect = this.page.locator('select').first();
      if ((await recurringSelect.count()) > 0) await recurringSelect.selectOption(options.recurring);
    }

    await Promise.all([
      this.page.waitForResponse(
        (resp) => resp.request().method() === 'POST' && resp.url().includes('/api/chores') && resp.ok()
      ),
      this.submitAddButton().click(),
    ]);
  }

  async addReward(name: string, cost: number, _requiresApproval = true): Promise<void> {
    // Note: the create form has no approval toggle; approval is a per-reward default /
    // edit-time setting. `_requiresApproval` is accepted for signature compatibility.
    await this.selectTab('rewards');
    await this.addButtons.reward.click();

    await this.page.getByPlaceholder(/movie night/i).fill(name);
    await this.page.locator('input[type="number"]').first().fill(String(cost));

    await Promise.all([
      this.page.waitForResponse(
        (resp) => resp.request().method() === 'POST' && resp.url().includes('/api/rewards') && resp.ok()
      ),
      this.submitAddButton().click(),
    ]);
  }

  async addParent(name: string, pin?: string): Promise<void> {
    await this.selectTab('parents');
    await this.addButtons.parent.click();

    await this.page.locator('input[type="text"]').first().fill(name);
    if (pin) {
      const pinInput = this.page.locator('input[placeholder*="pin" i], input[type="password"]');
      if ((await pinInput.count()) > 0) await pinInput.first().fill(pin);
    }

    await Promise.all([
      this.page.waitForResponse(
        (resp) => resp.request().method() === 'POST' && resp.url().includes('/api/parents') && resp.ok()
      ),
      this.submitAddButton().click(),
    ]);
  }

  // ============== Edit / Delete Operations ==============

  /** Entity cards render via `<EntityCard>` → `.card` with `title="Edit"`/`title="Delete"` buttons. */
  getEntityCard(name: string): Locator {
    return this.page
      .locator('.card')
      .filter({ has: this.page.locator('button[title="Delete"]') })
      .filter({ hasText: name })
      .first();
  }

  async clickEdit(entityName: string): Promise<void> {
    const card = this.getEntityCard(entityName);
    await expect(card).toBeVisible();
    await card.locator('button[title="Edit"]').first().click();
  }

  async clickDelete(entityName: string): Promise<void> {
    const card = this.getEntityCard(entityName);
    await expect(card).toBeVisible();
    const deleteBtn = card.locator('button[title="Delete"]').first();
    await deleteBtn.waitFor({ state: 'visible' });
    await deleteBtn.click();
  }

  async confirmDelete(): Promise<void> {
    await expect(this.deleteConfirmModal).toBeVisible();
    await this.page.getByTestId('confirm-delete-btn').click();
  }

  async cancelDelete(): Promise<void> {
    await expect(this.deleteConfirmModal).toBeVisible();
    await this.page.getByTestId('cancel-delete-btn').click();
  }

  async deleteEntity(entityName: string): Promise<void> {
    await this.clickDelete(entityName);
    await this.confirmDelete();
  }

  // ============== Approval Operations ==============

  async getPendingApprovalCount(): Promise<number> {
    const badge = this.tabs.approvals.getByTestId('pending-badge');
    if ((await badge.count()) > 0) {
      const text = await badge.textContent();
      return parseInt(text || '0', 10);
    }
    return 0;
  }

  async approveChore(kidName: string, choreName?: string): Promise<void> {
    await this.selectTab('approvals');

    let card = this.page.locator('[data-testid^="approval-chore-"]').filter({ hasText: kidName });
    if (choreName) card = card.filter({ hasText: choreName });

    await expect(card.first()).toBeVisible();
    await Promise.all([
      this.page.waitForResponse((resp) => resp.url().includes('/approve') && resp.ok()),
      card.first().getByRole('button', { name: /Approve/i }).click(),
    ]);
  }

  async disapproveChore(kidName: string, choreName?: string): Promise<void> {
    await this.selectTab('approvals');

    let card = this.page.locator('[data-testid^="approval-chore-"]').filter({ hasText: kidName });
    if (choreName) card = card.filter({ hasText: choreName });

    await expect(card.first()).toBeVisible();
    await Promise.all([
      this.page.waitForResponse((resp) => resp.url().includes('/disapprove') && resp.ok()),
      card.first().getByRole('button', { name: /Deny/i }).click(),
    ]);
  }

  // ============== Utility Methods ==============

  async entityExists(name: string): Promise<boolean> {
    return await this.getEntityCard(name).isVisible();
  }

  async getEntityCount(): Promise<number> {
    return await this.page
      .locator('.card')
      .filter({ has: this.page.locator('button[title="Delete"]') })
      .count();
  }

  async getKidPoints(kidName: string): Promise<number> {
    const card = this.getEntityCard(kidName);
    await expect(card).toBeVisible();
    const cardText = await card.textContent();
    const match = cardText?.match(/(\d+)\s*(?:points|pts)/i);
    return match ? parseInt(match[1], 10) : 0;
  }

  async hasPendingApprovals(): Promise<boolean> {
    await this.selectTab('approvals');
    return (await this.pendingApprovalCards.count()) > 0;
  }
}
