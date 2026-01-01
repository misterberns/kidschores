import { test, expect } from '../fixtures/test-database';
import { RewardsPage } from '../pages/RewardsPage';
import { TestData } from '../fixtures/test-data';

test.describe('Rewards Page', () => {
  let rewardsPage: RewardsPage;
  let kidId: string;
  let rewardId: string;

  test.beforeEach(async ({ page, apiContext, resetDatabase }) => {
    await resetDatabase();
    rewardsPage = new RewardsPage(page);

    // Create a kid with points
    const kidResp = await apiContext.post('/api/kids', { data: TestData.kid.emma() });
    const kid = await kidResp.json();
    kidId = kid.id;

    // Give the kid points
    await apiContext.post(`/api/kids/${kidId}/points`, { data: { points: 100 } });

    // Create a reward
    const rewardResp = await apiContext.post('/api/rewards', {
      data: TestData.reward.screenTime(50),
    });
    const reward = await rewardResp.json();
    rewardId = reward.id;
  });

  test.describe('Page Load', () => {
    test('should load rewards page', async ({ page }) => {
      await rewardsPage.goto();
      await expect(page).toHaveURL(/\/rewards/);
    });

    test('should show reward cards', async ({ page }) => {
      await rewardsPage.goto();
      await rewardsPage.waitForRewardsToLoad();

      expect(await rewardsPage.isRewardVisible('Extra Screen Time')).toBe(true);
    });

    test('should show empty state when no rewards', async ({ page, apiContext }) => {
      // Delete the reward
      await apiContext.delete(`/api/rewards/${rewardId}`);

      await rewardsPage.goto();
      await rewardsPage.waitForRewardsToLoad();

      expect(await rewardsPage.hasNoRewards()).toBe(true);
    });
  });

  test.describe('Reward Display', () => {
    test('should show reward name and cost', async ({ page }) => {
      await rewardsPage.goto();
      await rewardsPage.waitForRewardsToLoad();

      expect(await rewardsPage.isRewardVisible('Extra Screen Time')).toBe(true);
      expect(await rewardsPage.getRewardCost('Extra Screen Time')).toBe(50);
    });

    test('should show multiple rewards', async ({ page, apiContext }) => {
      await apiContext.post('/api/rewards', {
        data: TestData.reward.iceCream(75),
      });

      await rewardsPage.goto();
      await rewardsPage.waitForRewardsToLoad();

      expect(await rewardsPage.getRewardCount()).toBe(2);
    });
  });

  test.describe('Redeeming Rewards', () => {
    test('should redeem a reward', async ({ page }) => {
      await rewardsPage.goto();
      await rewardsPage.waitForRewardsToLoad();

      await rewardsPage.redeemReward('Extra Screen Time', 'Emma');

      // Verify pending status or success message
      await expect(page.getByText(/pending|redeemed|success/i)).toBeVisible();
    });

    test('should show pending approval for redeemed reward', async ({ page, apiContext }) => {
      // Redeem via API
      await apiContext.post(`/api/rewards/${rewardId}/redeem`, { data: { kid_id: kidId } });

      await rewardsPage.goto();

      // Should show pending status somewhere
      await expect(page.getByText(/pending|waiting|approval/i)).toBeVisible();
    });
  });

  test.describe('Affordability', () => {
    test('should allow redeem when kid has enough points', async ({ page }) => {
      await rewardsPage.goto();
      await rewardsPage.waitForRewardsToLoad();

      // 100 points, 50 cost - should be affordable
      expect(await rewardsPage.canKidAfford('Extra Screen Time', 100)).toBe(true);
    });

    test('should not allow redeem when kid lacks points', async ({ page }) => {
      expect(await rewardsPage.canKidAfford('Extra Screen Time', 25)).toBe(false);
    });
  });
});
