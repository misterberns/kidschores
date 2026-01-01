import { test, expect } from '../fixtures/test-database';
import { AdminPage } from '../pages/AdminPage';
import { HomePage } from '../pages/HomePage';
import { TestData } from '../fixtures/test-data';

test.describe('Admin Page', () => {
  let adminPage: AdminPage;

  test.beforeEach(async ({ page, resetDatabase }) => {
    await resetDatabase();
    adminPage = new AdminPage(page);
  });

  test.describe('Page Load', () => {
    test('should load admin page', async ({ page }) => {
      await adminPage.goto();
      await expect(page).toHaveURL(/\/admin/);
    });

    test('should show all tabs', async ({ page }) => {
      await adminPage.goto();

      await expect(adminPage.tabs.approvals).toBeVisible();
      await expect(adminPage.tabs.kids).toBeVisible();
      await expect(adminPage.tabs.chores).toBeVisible();
      await expect(adminPage.tabs.rewards).toBeVisible();
      await expect(adminPage.tabs.parents).toBeVisible();
    });
  });

  test.describe('Kids Management', () => {
    test('should add a new kid', async ({ page }) => {
      await adminPage.goto();
      await adminPage.addKid('Emma');

      // Verify kid appears in list
      await expect(page.getByText('Emma')).toBeVisible();
    });

    test('should add multiple kids', async ({ page }) => {
      await adminPage.goto();
      await adminPage.addKid('Emma');
      await adminPage.addKid('Jack');

      await expect(page.getByText('Emma')).toBeVisible();
      await expect(page.getByText('Jack')).toBeVisible();
    });

    test('should show kid on home page after adding', async ({ page }) => {
      await adminPage.goto();
      await adminPage.addKid('Emma');

      // Navigate to home and verify
      const homePage = new HomePage(page);
      await homePage.goto();
      await homePage.waitForKidsToLoad();

      expect(await homePage.isKidVisible('Emma')).toBe(true);
    });

    test('should delete a kid', async ({ page }) => {
      await adminPage.goto();
      await adminPage.addKid('Emma');

      // Delete the kid
      await adminPage.selectTab('kids');
      await adminPage.deleteEntity('Emma');

      // Verify kid is gone
      await expect(page.getByText('Emma')).not.toBeVisible();
    });

    test('should show delete confirmation modal', async ({ page }) => {
      await adminPage.goto();
      await adminPage.addKid('Emma');

      await adminPage.selectTab('kids');
      await adminPage.clickDelete('Emma');

      await expect(adminPage.deleteConfirmModal).toBeVisible();
      await expect(page.getByText(/delete/i)).toBeVisible();
    });

    test('should cancel deletion', async ({ page }) => {
      await adminPage.goto();
      await adminPage.addKid('Emma');

      await adminPage.selectTab('kids');
      await adminPage.clickDelete('Emma');
      await adminPage.cancelDelete();

      // Kid should still exist
      await expect(page.getByText('Emma')).toBeVisible();
    });
  });

  test.describe('Chores Management', () => {
    test('should add a new chore', async ({ page }) => {
      await adminPage.goto();
      await adminPage.addKid('Emma');
      await adminPage.addChore('Clean Room', 25, ['Emma']);

      await adminPage.selectTab('chores');
      await expect(page.getByText('Clean Room')).toBeVisible();
    });

    test('should show chore with points', async ({ page }) => {
      await adminPage.goto();
      await adminPage.addKid('Emma');
      await adminPage.addChore('Clean Room', 25, ['Emma']);

      await adminPage.selectTab('chores');
      await expect(page.getByText('25')).toBeVisible();
    });

    test('should delete a chore', async ({ page }) => {
      await adminPage.goto();
      await adminPage.addKid('Emma');
      await adminPage.addChore('Clean Room', 25, ['Emma']);

      await adminPage.selectTab('chores');
      await adminPage.deleteEntity('Clean Room');

      await expect(page.getByText('Clean Room')).not.toBeVisible();
    });
  });

  test.describe('Rewards Management', () => {
    test('should add a new reward', async ({ page }) => {
      await adminPage.goto();
      await adminPage.addReward('Extra Screen Time', 50);

      await adminPage.selectTab('rewards');
      await expect(page.getByText('Extra Screen Time')).toBeVisible();
    });

    test('should show reward cost', async ({ page }) => {
      await adminPage.goto();
      await adminPage.addReward('Extra Screen Time', 50);

      await adminPage.selectTab('rewards');
      await expect(page.getByText('50')).toBeVisible();
    });

    test('should delete a reward', async ({ page }) => {
      await adminPage.goto();
      await adminPage.addReward('Extra Screen Time', 50);

      await adminPage.selectTab('rewards');
      await adminPage.deleteEntity('Extra Screen Time');

      await expect(page.getByText('Extra Screen Time')).not.toBeVisible();
    });
  });

  test.describe('Parents Management', () => {
    test('should add a new parent', async ({ page }) => {
      await adminPage.goto();
      await adminPage.addParent('Mom', '1234');

      await adminPage.selectTab('parents');
      await expect(page.getByText('Mom')).toBeVisible();
    });

    test('should delete a parent', async ({ page }) => {
      await adminPage.goto();
      await adminPage.addParent('Mom');

      await adminPage.selectTab('parents');
      await adminPage.deleteEntity('Mom');

      await expect(page.getByText('Mom')).not.toBeVisible();
    });
  });

  test.describe('Approvals', () => {
    test('should show pending approvals badge', async ({ page, apiContext }) => {
      // Setup via API: create kid, chore, and claim
      const kidResp = await apiContext.post('/api/kids', { data: TestData.kid.emma() });
      const kid = await kidResp.json();

      const choreResp = await apiContext.post('/api/chores', {
        data: TestData.chore.cleanRoom([kid.id]),
      });
      const chore = await choreResp.json();

      await apiContext.post(`/api/chores/${chore.id}/claim`, { data: { kid_id: kid.id } });

      // Check admin page shows badge
      await adminPage.goto();
      const count = await adminPage.getPendingApprovalCount();
      expect(count).toBeGreaterThan(0);
    });

    test('should approve a pending chore', async ({ page, apiContext }) => {
      // Setup via API
      const kidResp = await apiContext.post('/api/kids', { data: TestData.kid.emma() });
      const kid = await kidResp.json();

      const choreResp = await apiContext.post('/api/chores', {
        data: TestData.chore.cleanRoom([kid.id]),
      });
      const chore = await choreResp.json();

      await apiContext.post(`/api/chores/${chore.id}/claim`, { data: { kid_id: kid.id } });

      // Approve via UI
      await adminPage.goto();
      await adminPage.approveChore('Emma');

      // Verify kid got points
      const updatedKid = await apiContext.get(`/api/kids/${kid.id}`);
      const kidData = await updatedKid.json();
      expect(kidData.points).toBe(25); // Clean Room default points
    });

    test('should disapprove a pending chore', async ({ page, apiContext }) => {
      // Setup via API
      const kidResp = await apiContext.post('/api/kids', { data: TestData.kid.emma() });
      const kid = await kidResp.json();

      const choreResp = await apiContext.post('/api/chores', {
        data: TestData.chore.cleanRoom([kid.id]),
      });
      const chore = await choreResp.json();

      await apiContext.post(`/api/chores/${chore.id}/claim`, { data: { kid_id: kid.id } });

      // Disapprove via UI
      await adminPage.goto();
      await adminPage.disapproveChore('Emma');

      // Verify kid has no points
      const updatedKid = await apiContext.get(`/api/kids/${kid.id}`);
      const kidData = await updatedKid.json();
      expect(kidData.points).toBe(0);
    });
  });

  test.describe('Tab Navigation', () => {
    test('should switch between tabs', async ({ page }) => {
      await adminPage.goto();
      await adminPage.addKid('Emma');
      await adminPage.addChore('Clean Room', 25, ['Emma']);
      await adminPage.addReward('Ice Cream', 50);

      // Switch to each tab and verify content
      await adminPage.selectTab('kids');
      await expect(page.getByText('Emma')).toBeVisible();

      await adminPage.selectTab('chores');
      await expect(page.getByText('Clean Room')).toBeVisible();

      await adminPage.selectTab('rewards');
      await expect(page.getByText('Ice Cream')).toBeVisible();
    });
  });
});
