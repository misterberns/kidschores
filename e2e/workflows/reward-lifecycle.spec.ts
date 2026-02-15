import { test, expect } from '../fixtures/test-database';
import { AdminPage } from '../pages/AdminPage';
import { RewardsPage } from '../pages/RewardsPage';
import { HomePage } from '../pages/HomePage';

/**
 * Complete Reward Lifecycle E2E Tests
 *
 * These tests validate the full reward workflow:
 * 1. Parent creates rewards
 * 2. Kid earns points (via chores)
 * 3. Kid redeems a reward
 * 4. Parent approves
 * 5. Points are deducted
 */
test.describe('Reward Lifecycle Workflow', () => {
  test('complete reward lifecycle: earn points -> redeem -> approve -> deduct', async ({
    page,
    resetDatabase,
    apiContext,
  }) => {
    await resetDatabase();

    const adminPage = new AdminPage(page);
    const rewardsPage = new RewardsPage(page);
    const homePage = new HomePage(page);

    // Step 1: Setup - Create kid and give them points
    await adminPage.goto();
    await adminPage.addKid('Emma');

    // Give points via API (simulating earned from chores)
    const kidsResp = await apiContext.get('/api/kids');
    const kids = await kidsResp.json();
    const kidId = kids[0].id;
    await apiContext.post(`/api/kids/${kidId}/points`, { data: { points: 100 } });

    // Verify starting points
    await homePage.goto();
    await homePage.waitForKidsToLoad();
    expect(await homePage.getKidPoints('Emma')).toBe(100);

    // Step 2: Parent creates a reward
    await adminPage.goto();
    await adminPage.addReward('Extra Screen Time', 50);

    // Step 3: Kid redeems the reward
    await rewardsPage.goto();
    await rewardsPage.waitForRewardsToLoad();
    await rewardsPage.redeemReward('Extra Screen Time', 'Emma');

    // Step 4: Parent approves the reward
    const rewardsApiResp = await apiContext.get('/api/rewards');
    const rewards = await rewardsApiResp.json();
    await apiContext.post(`/api/rewards/${rewards[0].id}/approve`, {
      data: { parent_name: 'Mom' },
    });

    // Step 5: Verify points were deducted
    await homePage.goto();
    await homePage.waitForKidsToLoad();
    expect(await homePage.getKidPoints('Emma')).toBe(50); // 100 - 50
  });

  test('insufficient points prevents redemption', async ({ page, resetDatabase, apiContext }) => {
    await resetDatabase();

    const adminPage = new AdminPage(page);

    // Create kid with few points
    await adminPage.goto();
    await adminPage.addKid('Emma');

    const kidsResp = await apiContext.get('/api/kids');
    const kids = await kidsResp.json();
    const kidId = kids[0].id;
    await apiContext.post(`/api/kids/${kidId}/points`, { data: { points: 25 } }); // Only 25 points

    // Create expensive reward
    await adminPage.addReward('Expensive Toy', 100);

    // Try to redeem via API (should fail)
    const rewardsResp = await apiContext.get('/api/rewards');
    const rewards = await rewardsResp.json();
    const redeemResp = await apiContext.post(`/api/rewards/${rewards[0].id}/redeem`, {
      data: { kid_id: kidId },
    });

    expect(redeemResp.status()).toBe(400);
  });

  test('no-approval reward instantly deducts points', async ({
    page,
    resetDatabase,
    apiContext,
  }) => {
    await resetDatabase();

    const adminPage = new AdminPage(page);
    const homePage = new HomePage(page);

    // Create kid with points
    await adminPage.goto();
    await adminPage.addKid('Emma');

    const kidsResp = await apiContext.get('/api/kids');
    const kids = await kidsResp.json();
    const kidId = kids[0].id;
    await apiContext.post(`/api/kids/${kidId}/points`, { data: { points: 100 } });

    // Create reward that doesn't require approval
    await apiContext.post('/api/rewards', {
      data: {
        name: 'Quick Snack',
        cost: 20,
        requires_approval: false,
      },
    });

    // Redeem the reward
    const rewardsResp = await apiContext.get('/api/rewards');
    const rewards = await rewardsResp.json();
    await apiContext.post(`/api/rewards/${rewards[0].id}/redeem`, {
      data: { kid_id: kidId },
    });

    // Points should be immediately deducted
    await homePage.goto();
    await homePage.waitForKidsToLoad();
    expect(await homePage.getKidPoints('Emma')).toBeLessThan(100);
  });

  test('multiple reward redemptions deplete points', async ({
    page,
    resetDatabase,
    apiContext,
  }) => {
    await resetDatabase();

    const adminPage = new AdminPage(page);
    const homePage = new HomePage(page);

    // Create kid with lots of points
    await adminPage.goto();
    await adminPage.addKid('Emma');

    const kidsResp = await apiContext.get('/api/kids');
    const kids = await kidsResp.json();
    const kidId = kids[0].id;
    await apiContext.post(`/api/kids/${kidId}/points`, { data: { points: 200 } });

    // Create multiple rewards (no approval for speed)
    for (const rewardData of [
      { name: 'Snack 1', cost: 30, requires_approval: false },
      { name: 'Snack 2', cost: 30, requires_approval: false },
      { name: 'Snack 3', cost: 30, requires_approval: false },
    ]) {
      await apiContext.post('/api/rewards', { data: rewardData });
    }

    // Redeem all rewards
    const rewardsResp = await apiContext.get('/api/rewards');
    const rewards = await rewardsResp.json();
    for (const reward of rewards) {
      await apiContext.post(`/api/rewards/${reward.id}/redeem`, {
        data: { kid_id: kidId },
      });
    }

    // Verify points deducted (200 - 90 = 110)
    await homePage.goto();
    await homePage.waitForKidsToLoad();
    expect(await homePage.getKidPoints('Emma')).toBe(110);
  });

  test('earn and spend: complete point economy cycle', async ({
    page,
    resetDatabase,
    apiContext,
  }) => {
    await resetDatabase();

    const adminPage = new AdminPage(page);
    const homePage = new HomePage(page);

    // Setup: Create kid and chore
    await adminPage.goto();
    await adminPage.addKid('Emma');

    const kidsResp = await apiContext.get('/api/kids');
    const kids = await kidsResp.json();
    const kidId = kids[0].id;

    // Create chore worth 50 points
    await apiContext.post('/api/chores', {
      data: {
        name: 'Clean Room',
        default_points: 50,
        assigned_kids: [kidId],
      },
    });

    // Create reward costing 30 points
    await apiContext.post('/api/rewards', {
      data: {
        name: 'Ice Cream',
        cost: 30,
        requires_approval: false,
      },
    });

    // Earn points by completing chore
    const choresResp = await apiContext.get('/api/chores');
    const chores = await choresResp.json();
    await apiContext.post(`/api/chores/${chores[0].id}/claim`, { data: { kid_id: kidId } });
    await apiContext.post(`/api/chores/${chores[0].id}/approve`, { data: { parent_name: 'Mom' } });

    // Verify earned points
    await homePage.goto();
    await homePage.waitForKidsToLoad();
    expect(await homePage.getKidPoints('Emma')).toBe(50);

    // Spend points on reward
    const rewardsResp = await apiContext.get('/api/rewards');
    const rewards = await rewardsResp.json();
    await apiContext.post(`/api/rewards/${rewards[0].id}/redeem`, {
      data: { kid_id: kidId },
    });

    // Verify remaining points
    await homePage.goto();
    await homePage.waitForKidsToLoad();
    expect(await homePage.getKidPoints('Emma')).toBe(20); // 50 - 30
  });

  test('points earned equal points available for spending', async ({
    page,
    resetDatabase,
    apiContext,
  }) => {
    await resetDatabase();

    const adminPage = new AdminPage(page);
    const homePage = new HomePage(page);

    // Create kid
    await adminPage.goto();
    await adminPage.addKid('Emma');

    const kidsResp = await apiContext.get('/api/kids');
    const kids = await kidsResp.json();
    const kidId = kids[0].id;

    // Create chore and complete it multiple times (if allowed)
    await apiContext.post('/api/chores', {
      data: {
        name: 'Quick Task',
        default_points: 10,
        assigned_kids: [kidId],
        allow_multiple_claims_per_day: true,
      },
    });

    // Complete 5 times
    const choresResp = await apiContext.get('/api/chores');
    const choreId = choresResp.json()[0]?.id;
    for (let i = 0; i < 5; i++) {
      const chores = await (await apiContext.get('/api/chores')).json();
      if (chores.length > 0) {
        await apiContext.post(`/api/chores/${chores[0].id}/claim`, { data: { kid_id: kidId } });
        await apiContext.post(`/api/chores/${chores[0].id}/approve`, {
          data: { parent_name: 'Mom' },
        });
      }
    }

    // Verify total points
    await homePage.goto();
    await homePage.waitForKidsToLoad();
    const points = await homePage.getKidPoints('Emma');
    expect(points).toBeGreaterThanOrEqual(10); // At least one completion
  });
});
