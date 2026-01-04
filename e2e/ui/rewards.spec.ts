import { test, expect } from '../fixtures/test-database';
import { RewardsPage } from '../pages/RewardsPage';

// Generate unique names for test data to avoid conflicts with leftover data
const uniqueId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

test.describe('Rewards Page', () => {
  let rewardsPage: RewardsPage;
  let kidId: string;
  let rewardId: string;
  let testId: string;
  let kidName: string;
  let rewardName: string;

  test.beforeEach(async ({ authenticatedPage, authApiContext, resetDatabase }) => {
    // Try to reset, but tests should still work with leftover data
    try {
      await resetDatabase();
    } catch (e) {
      console.log('Reset failed, continuing with existing data');
    }
    rewardsPage = new RewardsPage(authenticatedPage);
    testId = uniqueId();
    kidName = `RewardKid_${testId}`;
    rewardName = `Reward_${testId}`;

    // Create a kid with points using unique name
    const kidResp = await authApiContext.post('/api/kids', { data: { name: kidName, enable_notifications: true } });
    const kid = await kidResp.json();
    kidId = kid.id;

    // Give the kid points
    await authApiContext.post(`/api/kids/${kidId}/points`, { data: { points: 100 } });

    // Create a reward with unique name
    const rewardResp = await authApiContext.post('/api/rewards', {
      data: {
        name: rewardName,
        description: '30 minutes of extra screen time',
        icon: '📱',
        cost: 50,
        eligible_kids: [],
        requires_approval: true,
      },
    });
    const reward = await rewardResp.json();
    rewardId = reward.id;
  });

  test.describe('Page Load', () => {
    test('should load rewards page', async ({ authenticatedPage }) => {
      await rewardsPage.goto();
      await expect(authenticatedPage).toHaveURL(/\/rewards/);
    });

    test('should show reward cards', async ({ authenticatedPage }) => {
      await rewardsPage.goto();
      await rewardsPage.waitForRewardsToLoad();

      expect(await rewardsPage.isRewardVisible(rewardName)).toBe(true);
    });

    test('should show empty state when no rewards', async ({ authenticatedPage, authApiContext }) => {
      // Delete the reward created in beforeEach
      await authApiContext.delete(`/api/rewards/${rewardId}`);

      await rewardsPage.goto();
      await rewardsPage.waitForRewardsToLoad();

      expect(await rewardsPage.hasNoRewards()).toBe(true);
    });
  });

  test.describe('Reward Display', () => {
    test('should show reward name and cost', async ({ authenticatedPage }) => {
      await rewardsPage.goto();
      await rewardsPage.waitForRewardsToLoad();

      expect(await rewardsPage.isRewardVisible(rewardName)).toBe(true);
      expect(await rewardsPage.getRewardCost(rewardName)).toBe(50);
    });

    test('should show multiple rewards', async ({ authenticatedPage, authApiContext }) => {
      // Use completely distinct name to avoid substring matching
      const iceCreamReward = `IceCream_${testId}`;
      await authApiContext.post('/api/rewards', {
        data: {
          name: iceCreamReward,
          description: 'Choose your favorite ice cream',
          icon: '🍦',
          cost: 75,
          eligible_kids: [],
          requires_approval: false,
        },
      });

      await rewardsPage.goto();
      await rewardsPage.waitForRewardsToLoad();

      // Verify both rewards are visible by checking for their unique names
      await expect(authenticatedPage.getByText(rewardName)).toBeVisible();
      await expect(authenticatedPage.getByText(iceCreamReward)).toBeVisible();
    });
  });

  test.describe('Redeeming Rewards', () => {
    test('should redeem a reward', async ({ authenticatedPage, authApiContext }) => {
      await rewardsPage.goto();
      await rewardsPage.waitForRewardsToLoad();

      await rewardsPage.redeemReward(rewardName, kidName);

      // Since reward requires_approval=true, points are not deducted until approved
      // Verify the pending redemption was created
      await authenticatedPage.waitForTimeout(500); // Wait for mutation to complete
      const approvalsResp = await authApiContext.get('/api/approvals/pending');
      const approvals = await approvalsResp.json();
      const hasPendingReward = approvals.rewards.some(
        (r: { reward_id: string; kid_id: string }) => r.reward_id === rewardId && r.kid_id === kidId
      );
      expect(hasPendingReward).toBe(true);
    });

    test('should show pending approval for redeemed reward', async ({ authenticatedPage, authApiContext }) => {
      // Redeem via API
      await authApiContext.post(`/api/rewards/${rewardId}/redeem`, { data: { kid_id: kidId } });

      // Navigate to admin page to check pending approvals
      await authenticatedPage.goto('/admin');
      await authenticatedPage.waitForLoadState('networkidle');

      // Should show pending reward in approvals tab
      await expect(authenticatedPage.getByText(kidName)).toBeVisible();
      await expect(authenticatedPage.getByText(/wants a reward/i)).toBeVisible();
    });
  });

  test.describe('Affordability', () => {
    test('should allow redeem when kid has enough points', async ({ authenticatedPage }) => {
      await rewardsPage.goto();
      await rewardsPage.waitForRewardsToLoad();

      // 100 points, 50 cost - should be affordable
      expect(await rewardsPage.canKidAfford(rewardName, 100)).toBe(true);
    });

    test('should not allow redeem when kid lacks points', async ({ authenticatedPage }) => {
      // Need to navigate to the rewards page first
      await rewardsPage.goto();
      await rewardsPage.waitForRewardsToLoad();

      expect(await rewardsPage.canKidAfford(rewardName, 25)).toBe(false);
    });
  });
});
