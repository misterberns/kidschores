import { test, expect } from '../fixtures/test-database';
import { AdminPage } from '../pages/AdminPage';
import { HomePage } from '../pages/HomePage';

// Generate unique names for test data to avoid conflicts with leftover data
const uniqueId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

test.describe('Admin Page', () => {
  let adminPage: AdminPage;
  let testId: string;

  test.beforeEach(async ({ authenticatedPage, resetDatabase }) => {
    // Try to reset, but tests should still work with leftover data
    try {
      await resetDatabase();
    } catch (e) {
      console.log('Reset failed, continuing with existing data');
    }
    adminPage = new AdminPage(authenticatedPage);
    testId = uniqueId(); // Unique ID for this test run
  });

  test.describe('Page Load', () => {
    test('should load admin page', async ({ authenticatedPage }) => {
      await adminPage.goto();
      await expect(authenticatedPage).toHaveURL(/\/admin/);
    });

    test('should show all tabs', async ({ authenticatedPage }) => {
      await adminPage.goto();

      await expect(adminPage.tabs.approvals).toBeVisible();
      await expect(adminPage.tabs.kids).toBeVisible();
      await expect(adminPage.tabs.chores).toBeVisible();
      await expect(adminPage.tabs.rewards).toBeVisible();
      await expect(adminPage.tabs.parents).toBeVisible();
    });
  });

  test.describe('Kids Management', () => {
    test('should add a new kid', async ({ authenticatedPage }) => {
      const kidName = `TestKid_${testId}`;
      await adminPage.goto();
      await adminPage.addKid(kidName);

      // Verify kid appears in list
      await expect(authenticatedPage.getByText(kidName)).toBeVisible();
    });

    test('should add multiple kids', async ({ authenticatedPage }) => {
      const kid1 = `TestKid1_${testId}`;
      const kid2 = `TestKid2_${testId}`;
      await adminPage.goto();
      await adminPage.addKid(kid1);
      await adminPage.addKid(kid2);

      await expect(authenticatedPage.getByText(kid1)).toBeVisible();
      await expect(authenticatedPage.getByText(kid2)).toBeVisible();
    });

    test('should show kid on home page after adding', async ({ authenticatedPage }) => {
      const kidName = `HomeKid_${testId}`;
      await adminPage.goto();
      await adminPage.addKid(kidName);

      // Navigate to home and verify
      const homePage = new HomePage(authenticatedPage);
      await homePage.goto();
      // Reload to ensure React Query fetches fresh data from API
      await authenticatedPage.reload({ waitUntil: 'networkidle' });
      await homePage.waitForKidsToLoad();

      expect(await homePage.isKidVisible(kidName)).toBe(true);
    });

    test('should delete a kid', async ({ authenticatedPage }) => {
      const kidName = `DeleteKid_${testId}`;
      await adminPage.goto();
      await adminPage.addKid(kidName);

      // Delete the kid
      await adminPage.selectTab('kids');
      await adminPage.deleteEntity(kidName);

      // Wait for modal to close and verify kid card is gone
      await expect(adminPage.deleteConfirmModal).not.toBeVisible();
      await expect(adminPage.getEntityCard(kidName)).not.toBeVisible();
    });

    test('should show delete confirmation modal', async ({ authenticatedPage }) => {
      const kidName = `ModalKid_${testId}`;
      await adminPage.goto();
      await adminPage.addKid(kidName);

      await adminPage.selectTab('kids');
      await adminPage.clickDelete(kidName);

      // Verify modal is visible with the entity name in the heading
      await expect(adminPage.deleteConfirmModal).toBeVisible();
      await expect(adminPage.deleteConfirmModal.locator('h3, [class*="font-bold"]')).toContainText(kidName);
    });

    test('should cancel deletion', async ({ authenticatedPage }) => {
      const kidName = `CancelKid_${testId}`;
      await adminPage.goto();
      await adminPage.addKid(kidName);

      await adminPage.selectTab('kids');
      await adminPage.clickDelete(kidName);
      await adminPage.cancelDelete();

      // Modal should close and kid card should still exist
      await expect(adminPage.deleteConfirmModal).not.toBeVisible();
      await expect(adminPage.getEntityCard(kidName)).toBeVisible();
    });
  });

  test.describe('Chores Management', () => {
    test('should add a new chore', async ({ authenticatedPage }) => {
      const kidName = `ChoreKid_${testId}`;
      const choreName = `ChoreTask_${testId}`;
      await adminPage.goto();
      await adminPage.addKid(kidName);
      await adminPage.addChore(choreName, 25, [kidName]);

      await adminPage.selectTab('chores');
      await expect(authenticatedPage.getByText(choreName)).toBeVisible();
    });

    test('should show chore with points', async ({ authenticatedPage }) => {
      const kidName = `PointsKid_${testId}`;
      const choreName = `PointsChore_${testId}`;
      await adminPage.goto();
      await adminPage.addKid(kidName);
      await adminPage.addChore(choreName, 35, [kidName]);

      await adminPage.selectTab('chores');
      // Verify the chore card contains 35 points
      await expect(authenticatedPage.locator(`text=${choreName}`).locator('..').locator('..').getByText('35')).toBeVisible();
    });

    test('should delete a chore', async ({ authenticatedPage }) => {
      const kidName = `DelChoreKid_${testId}`;
      const choreName = `DelChore_${testId}`;
      await adminPage.goto();
      await adminPage.addKid(kidName);
      await adminPage.addChore(choreName, 25, [kidName]);

      await adminPage.selectTab('chores');
      await adminPage.deleteEntity(choreName);

      // Wait for modal to close and verify chore card is gone
      await expect(adminPage.deleteConfirmModal).not.toBeVisible();
      await expect(adminPage.getEntityCard(choreName)).not.toBeVisible();
    });
  });

  test.describe('Rewards Management', () => {
    test('should add a new reward', async ({ authenticatedPage }) => {
      const rewardName = `Reward_${testId}`;
      await adminPage.goto();
      await adminPage.addReward(rewardName, 50);

      await adminPage.selectTab('rewards');
      await expect(authenticatedPage.getByText(rewardName)).toBeVisible();
    });

    test('should show reward cost', async ({ authenticatedPage }) => {
      const rewardName = `CostReward_${testId}`;
      await adminPage.goto();
      await adminPage.addReward(rewardName, 75);

      await adminPage.selectTab('rewards');
      // Verify the reward card contains the cost
      await expect(authenticatedPage.locator(`text=${rewardName}`).locator('..').locator('..').getByText('75')).toBeVisible();
    });

    test('should delete a reward', async ({ authenticatedPage }) => {
      const rewardName = `DelReward_${testId}`;
      await adminPage.goto();
      await adminPage.addReward(rewardName, 50);

      await adminPage.selectTab('rewards');
      await adminPage.deleteEntity(rewardName);

      // Wait for modal to close and verify reward card is gone
      await expect(adminPage.deleteConfirmModal).not.toBeVisible();
      await expect(adminPage.getEntityCard(rewardName)).not.toBeVisible();
    });
  });

  test.describe('Parents Management', () => {
    test('should add a new parent', async ({ authenticatedPage }) => {
      const parentName = `Parent_${testId}`;
      await adminPage.goto();
      await adminPage.addParent(parentName, '1234');

      await adminPage.selectTab('parents');
      await expect(authenticatedPage.getByText(parentName)).toBeVisible();
    });

    test('should delete a parent', async ({ authenticatedPage }) => {
      const parentName = `DelParent_${testId}`;
      await adminPage.goto();
      await adminPage.addParent(parentName, '1234');

      await adminPage.selectTab('parents');
      await adminPage.deleteEntity(parentName);

      // Wait for modal to close and verify parent card is gone
      await expect(adminPage.deleteConfirmModal).not.toBeVisible();
      await expect(adminPage.getEntityCard(parentName)).not.toBeVisible();
    });
  });

  test.describe('Approvals', () => {
    test('should show pending approvals badge', async ({ authenticatedPage, authApiContext }) => {
      const kidName = `ApprovalKid_${testId}`;
      const choreName = `ApprovalChore_${testId}`;

      // Setup via API: create kid, chore, and claim
      const kidResp = await authApiContext.post('/api/kids', { data: { name: kidName, enable_notifications: true } });
      const kid = await kidResp.json();

      const choreResp = await authApiContext.post('/api/chores', {
        data: { name: choreName, default_points: 25, assigned_kids: [kid.id] },
      });
      const chore = await choreResp.json();

      await authApiContext.post(`/api/chores/${chore.id}/claim`, { data: { kid_id: kid.id } });

      // Check admin page shows badge
      await adminPage.goto();
      const count = await adminPage.getPendingApprovalCount();
      expect(count).toBeGreaterThan(0);
    });

    test('should approve a pending chore', async ({ authenticatedPage, authApiContext }) => {
      const kidName = `ApproveKid_${testId}`;
      const choreName = `ApproveChore_${testId}`;

      // Setup via API
      const kidResp = await authApiContext.post('/api/kids', { data: { name: kidName, enable_notifications: true } });
      const kid = await kidResp.json();

      const choreResp = await authApiContext.post('/api/chores', {
        data: { name: choreName, default_points: 25, assigned_kids: [kid.id] },
      });
      const chore = await choreResp.json();

      await authApiContext.post(`/api/chores/${chore.id}/claim`, { data: { kid_id: kid.id } });

      // Approve via UI
      await adminPage.goto();
      await adminPage.approveChore(kidName);

      // Verify kid got points
      const updatedKid = await authApiContext.get(`/api/kids/${kid.id}`);
      const kidData = await updatedKid.json();
      expect(kidData.points).toBe(25); // Clean Room default points
    });

    test('should disapprove a pending chore', async ({ authenticatedPage, authApiContext }) => {
      const kidName = `DenyKid_${testId}`;
      const choreName = `DenyChore_${testId}`;

      // Setup via API
      const kidResp = await authApiContext.post('/api/kids', { data: { name: kidName, enable_notifications: true } });
      const kid = await kidResp.json();

      const choreResp = await authApiContext.post('/api/chores', {
        data: { name: choreName, default_points: 25, assigned_kids: [kid.id] },
      });
      const chore = await choreResp.json();

      await authApiContext.post(`/api/chores/${chore.id}/claim`, { data: { kid_id: kid.id } });

      // Disapprove via UI
      await adminPage.goto();
      await adminPage.disapproveChore(kidName);

      // Verify kid has no points
      const updatedKid = await authApiContext.get(`/api/kids/${kid.id}`);
      const kidData = await updatedKid.json();
      expect(kidData.points).toBe(0);
    });
  });

  test.describe('Tab Navigation', () => {
    test('should switch between tabs', async ({ authenticatedPage }) => {
      const kidName = `NavKid_${testId}`;
      const choreName = `NavChore_${testId}`;
      const rewardName = `NavReward_${testId}`;

      await adminPage.goto();
      await adminPage.addKid(kidName);
      await adminPage.addChore(choreName, 25, [kidName]);
      await adminPage.addReward(rewardName, 50);

      // Switch to each tab and verify content
      await adminPage.selectTab('kids');
      await expect(authenticatedPage.getByText(kidName)).toBeVisible();

      await adminPage.selectTab('chores');
      await expect(authenticatedPage.getByText(choreName)).toBeVisible();

      await adminPage.selectTab('rewards');
      await expect(authenticatedPage.getByText(rewardName)).toBeVisible();
    });
  });
});
