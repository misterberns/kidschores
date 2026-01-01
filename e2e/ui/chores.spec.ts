import { test, expect } from '../fixtures/test-database';
import { ChoresPage } from '../pages/ChoresPage';
import { TestData } from '../fixtures/test-data';

test.describe('Chores Page', () => {
  let choresPage: ChoresPage;
  let kidId: string;
  let choreId: string;

  test.beforeEach(async ({ page, apiContext, resetDatabase }) => {
    await resetDatabase();
    choresPage = new ChoresPage(page);

    // Create a kid and chore via API
    const kidResp = await apiContext.post('/api/kids', { data: TestData.kid.emma() });
    const kid = await kidResp.json();
    kidId = kid.id;

    const choreResp = await apiContext.post('/api/chores', {
      data: TestData.chore.cleanRoom([kidId]),
    });
    const chore = await choreResp.json();
    choreId = chore.id;
  });

  test.describe('Page Load', () => {
    test('should load chores page', async ({ page }) => {
      await choresPage.goto();
      await expect(page).toHaveURL(/\/chores/);
    });

    test('should show chore cards', async ({ page }) => {
      await choresPage.goto();
      await choresPage.waitForChoresToLoad();

      expect(await choresPage.isChoreVisible('Clean Room')).toBe(true);
    });

    test('should show empty state when no chores', async ({ page, apiContext }) => {
      // Delete the chore
      await apiContext.delete(`/api/chores/${choreId}`);

      await choresPage.goto();
      await choresPage.waitForChoresToLoad();

      expect(await choresPage.hasNoChores()).toBe(true);
    });
  });

  test.describe('Chore Display', () => {
    test('should show chore name and points', async ({ page }) => {
      await choresPage.goto();
      await choresPage.waitForChoresToLoad();

      expect(await choresPage.isChoreVisible('Clean Room')).toBe(true);
      expect(await choresPage.getChorePoints('Clean Room')).toBe(25);
    });

    test('should show multiple chores', async ({ page, apiContext }) => {
      await apiContext.post('/api/chores', {
        data: TestData.chore.doHomework([kidId]),
      });

      await choresPage.goto();
      await choresPage.waitForChoresToLoad();

      expect(await choresPage.getChoreCount()).toBe(2);
    });
  });

  test.describe('Claiming Chores', () => {
    test('should claim a chore', async ({ page }) => {
      await choresPage.goto();
      await choresPage.waitForChoresToLoad();

      await choresPage.claimChore('Clean Room', 'Emma');

      // Verify status changed
      expect(await choresPage.isChoreClained('Clean Room')).toBe(true);
    });

    test('should show claimed status', async ({ page, apiContext }) => {
      // Claim via API
      await apiContext.post(`/api/chores/${choreId}/claim`, { data: { kid_id: kidId } });

      await choresPage.goto();
      await choresPage.waitForChoresToLoad();

      expect(await choresPage.isChoreClained('Clean Room')).toBe(true);
    });

    test('should show pending approval message after claim', async ({ page }) => {
      await choresPage.goto();
      await choresPage.waitForChoresToLoad();

      await choresPage.claimChore('Clean Room', 'Emma');

      await expect(page.getByText(/pending|waiting|approval/i)).toBeVisible();
    });
  });

  test.describe('Assigned Kids', () => {
    test('should show assigned kids', async ({ page }) => {
      await choresPage.goto();
      await choresPage.waitForChoresToLoad();

      const assignedKids = await choresPage.getAssignedKids('Clean Room');
      expect(assignedKids.length).toBeGreaterThan(0);
    });
  });
});
