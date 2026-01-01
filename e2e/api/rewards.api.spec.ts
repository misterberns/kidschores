import { test, expect } from '../fixtures/test-database';
import { TestData } from '../fixtures/test-data';

test.describe('Rewards API', () => {
  let kidId: string;

  test.beforeEach(async ({ apiContext, resetDatabase }) => {
    await resetDatabase();

    // Create a test kid with points for redemption
    const kidResp = await apiContext.post('/api/kids', { data: TestData.kid.emma() });
    const kid = await kidResp.json();
    kidId = kid.id;

    // Give the kid some points
    await apiContext.post(`/api/kids/${kidId}/points`, { data: { points: 200 } });
  });

  test.describe('CRUD Operations', () => {
    test('should create a new reward', async ({ apiContext }) => {
      const rewardData = TestData.reward.screenTime();

      const response = await apiContext.post('/api/rewards', { data: rewardData });

      expect(response.ok()).toBeTruthy();
      const reward = await response.json();
      expect(reward.name).toBe('Extra Screen Time');
      expect(reward.cost).toBe(50);
      expect(reward.requires_approval).toBe(true);
      expect(reward.id).toBeDefined();
    });

    test('should list all rewards', async ({ apiContext }) => {
      await apiContext.post('/api/rewards', { data: TestData.reward.screenTime() });
      await apiContext.post('/api/rewards', { data: TestData.reward.iceCream() });

      const response = await apiContext.get('/api/rewards');

      expect(response.ok()).toBeTruthy();
      const rewards = await response.json();
      expect(rewards).toHaveLength(2);
    });

    test('should get a reward by ID', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/rewards', {
        data: TestData.reward.screenTime(),
      });
      const created = await createResp.json();

      const response = await apiContext.get(`/api/rewards/${created.id}`);

      expect(response.ok()).toBeTruthy();
      const reward = await response.json();
      expect(reward.id).toBe(created.id);
      expect(reward.name).toBe('Extra Screen Time');
    });

    test('should update a reward', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/rewards', {
        data: TestData.reward.screenTime(),
      });
      const created = await createResp.json();

      const response = await apiContext.put(`/api/rewards/${created.id}`, {
        data: {
          name: 'Extra Screen Time (1 hour)',
          cost: 75,
        },
      });

      expect(response.ok()).toBeTruthy();
      const updated = await response.json();
      expect(updated.name).toBe('Extra Screen Time (1 hour)');
      expect(updated.cost).toBe(75);
    });

    test('should delete a reward', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/rewards', {
        data: TestData.reward.screenTime(),
      });
      const created = await createResp.json();

      const deleteResp = await apiContext.delete(`/api/rewards/${created.id}`);
      expect(deleteResp.ok()).toBeTruthy();

      // Verify reward is gone
      const getResp = await apiContext.get(`/api/rewards/${created.id}`);
      expect(getResp.status()).toBe(404);
    });
  });

  test.describe('Redemption Workflow', () => {
    test('should redeem a reward', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/rewards', {
        data: TestData.reward.screenTime(50), // 50 points
      });
      const reward = await createResp.json();

      const response = await apiContext.post(`/api/rewards/${reward.id}/redeem`, {
        data: { kid_id: kidId },
      });

      expect(response.ok()).toBeTruthy();
      const claim = await response.json();
      expect(claim.kid_id).toBe(kidId);
      expect(claim.reward_id).toBe(reward.id);
    });

    test('should prevent redemption with insufficient points', async ({ apiContext }) => {
      // Create reward that costs more than kid has
      const createResp = await apiContext.post('/api/rewards', {
        data: TestData.reward.create({ cost: 500 }), // Kid only has 200
      });
      const reward = await createResp.json();

      const response = await apiContext.post(`/api/rewards/${reward.id}/redeem`, {
        data: { kid_id: kidId },
      });

      expect(response.status()).toBe(400);
    });

    test('should approve a redeemed reward and deduct points', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/rewards', {
        data: TestData.reward.screenTime(50),
      });
      const reward = await createResp.json();

      // Redeem
      await apiContext.post(`/api/rewards/${reward.id}/redeem`, { data: { kid_id: kidId } });

      // Approve
      const response = await apiContext.post(`/api/rewards/${reward.id}/approve`, {
        data: { parent_name: 'Mom' },
      });

      expect(response.ok()).toBeTruthy();

      // Verify points were deducted
      const kidResp = await apiContext.get(`/api/kids/${kidId}`);
      const kid = await kidResp.json();
      expect(kid.points).toBe(150); // 200 - 50
    });

    test('should not require approval when disabled', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/rewards', {
        data: {
          ...TestData.reward.iceCream(30),
          requires_approval: false,
        },
      });
      const reward = await createResp.json();

      // Redeem - should auto-approve
      const response = await apiContext.post(`/api/rewards/${reward.id}/redeem`, {
        data: { kid_id: kidId },
      });

      expect(response.ok()).toBeTruthy();

      // Verify points were immediately deducted
      const kidResp = await apiContext.get(`/api/kids/${kidId}`);
      const kid = await kidResp.json();
      expect(kid.points).toBeLessThan(200);
    });
  });

  test.describe('Eligible Kids', () => {
    test('should create reward with eligible kids', async ({ apiContext }) => {
      const response = await apiContext.post('/api/rewards', {
        data: {
          ...TestData.reward.screenTime(),
          eligible_kids: [kidId],
        },
      });

      expect(response.ok()).toBeTruthy();
      const reward = await response.json();
      expect(reward.eligible_kids).toContain(kidId);
    });

    test('should allow any kid when eligible_kids is empty', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/rewards', {
        data: {
          ...TestData.reward.screenTime(),
          eligible_kids: [],
        },
      });
      const reward = await createResp.json();

      // Should allow redemption
      const response = await apiContext.post(`/api/rewards/${reward.id}/redeem`, {
        data: { kid_id: kidId },
      });

      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('Edge Cases', () => {
    test('should return array for rewards list', async ({ apiContext }) => {
      const response = await apiContext.get('/api/rewards');

      expect(response.ok()).toBeTruthy();
      const rewards = await response.json();
      // Verify response is an array (may or may not be empty depending on cleanup)
      expect(Array.isArray(rewards)).toBe(true);
    });

    test('should handle reward with zero cost', async ({ apiContext }) => {
      const response = await apiContext.post('/api/rewards', {
        data: {
          name: 'Free Hug',
          cost: 0,
          requires_approval: false,
        },
      });

      expect(response.ok()).toBeTruthy();
      const reward = await response.json();
      expect(reward.cost).toBe(0);
    });
  });
});
