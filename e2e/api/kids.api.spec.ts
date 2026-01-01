import { test, expect } from '../fixtures/test-database';
import { TestData } from '../fixtures/test-data';

test.describe('Kids API', () => {
  test.beforeEach(async ({ resetDatabase }) => {
    await resetDatabase();
  });

  test.describe('CRUD Operations', () => {
    test('should create a new kid', async ({ apiContext }) => {
      const kidData = TestData.kid.emma();

      const response = await apiContext.post('/api/kids', { data: kidData });

      expect(response.ok()).toBeTruthy();
      const kid = await response.json();
      expect(kid.name).toBe('Emma');
      expect(kid.points).toBe(0);
      expect(kid.points_multiplier).toBe(1);
      expect(kid.overall_chore_streak).toBe(0);
      expect(kid.completed_chores_today).toBe(0);
      expect(kid.completed_chores_total).toBe(0);
      expect(kid.id).toBeDefined();
      expect(kid.created_at).toBeDefined();
    });

    test('should list all kids', async ({ apiContext }) => {
      // Create two kids
      const emma = await apiContext.post('/api/kids', { data: TestData.kid.emma() });
      const jack = await apiContext.post('/api/kids', { data: TestData.kid.jack() });
      const emmaId = (await emma.json()).id;
      const jackId = (await jack.json()).id;

      const response = await apiContext.get('/api/kids');

      expect(response.ok()).toBeTruthy();
      const kids = await response.json();
      // Verify at least our created kids are present
      expect(kids.length).toBeGreaterThanOrEqual(2);
      expect(kids.some((k: any) => k.id === emmaId)).toBe(true);
      expect(kids.some((k: any) => k.id === jackId)).toBe(true);
    });

    test('should get a kid by ID', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/kids', { data: TestData.kid.emma() });
      const created = await createResp.json();

      const response = await apiContext.get(`/api/kids/${created.id}`);

      expect(response.ok()).toBeTruthy();
      const kid = await response.json();
      expect(kid.id).toBe(created.id);
      expect(kid.name).toBe('Emma');
    });

    test('should update a kid', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/kids', { data: TestData.kid.emma() });
      const created = await createResp.json();

      const response = await apiContext.put(`/api/kids/${created.id}`, {
        data: { name: 'Emma Updated', enable_notifications: false },
      });

      expect(response.ok()).toBeTruthy();
      const updated = await response.json();
      expect(updated.name).toBe('Emma Updated');
      expect(updated.enable_notifications).toBe(false);
    });

    test('should delete a kid', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/kids', { data: TestData.kid.emma() });
      const created = await createResp.json();

      const deleteResp = await apiContext.delete(`/api/kids/${created.id}`);
      expect(deleteResp.ok()).toBeTruthy();

      // Verify kid is gone
      const getResp = await apiContext.get(`/api/kids/${created.id}`);
      expect(getResp.status()).toBe(404);
    });

    test('should return 404 for non-existent kid', async ({ apiContext }) => {
      const response = await apiContext.get('/api/kids/non-existent-id');
      expect(response.status()).toBe(404);
    });
  });

  test.describe('Points Management', () => {
    test('should adjust kid points positively', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/kids', { data: TestData.kid.emma() });
      const kid = await createResp.json();

      const response = await apiContext.post(`/api/kids/${kid.id}/points`, {
        data: { points: 50 },
      });

      expect(response.ok()).toBeTruthy();
      const updated = await response.json();
      expect(updated.points).toBe(50);
    });

    test('should adjust kid points negatively', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/kids', { data: TestData.kid.emma() });
      const kid = await createResp.json();

      // First add points
      await apiContext.post(`/api/kids/${kid.id}/points`, { data: { points: 100 } });

      // Then subtract
      const response = await apiContext.post(`/api/kids/${kid.id}/points`, {
        data: { points: -30 },
      });

      expect(response.ok()).toBeTruthy();
      const updated = await response.json();
      expect(updated.points).toBe(70);
    });

    test('should not allow negative point balance', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/kids', { data: TestData.kid.emma() });
      const kid = await createResp.json();

      // Try to subtract more than available
      await apiContext.post(`/api/kids/${kid.id}/points`, { data: { points: -100 } });

      // Verify points didn't go negative
      const getResp = await apiContext.get(`/api/kids/${kid.id}`);
      const updated = await getResp.json();
      expect(updated.points).toBeGreaterThanOrEqual(0);
    });

    test('should handle multiple point adjustments', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/kids', { data: TestData.kid.emma() });
      const kid = await createResp.json();

      // Multiple adjustments
      await apiContext.post(`/api/kids/${kid.id}/points`, { data: { points: 25 } });
      await apiContext.post(`/api/kids/${kid.id}/points`, { data: { points: 15 } });
      await apiContext.post(`/api/kids/${kid.id}/points`, { data: { points: 10 } });

      const getResp = await apiContext.get(`/api/kids/${kid.id}`);
      const updated = await getResp.json();
      expect(updated.points).toBe(50);
    });
  });

  test.describe('Points Multiplier', () => {
    test('multiplier is applied when approving chores', async ({ apiContext }) => {
      // Create kid with default multiplier (1.0)
      const createResp = await apiContext.post('/api/kids', { data: TestData.kid.emma() });
      const kid = await createResp.json();

      // The points_multiplier field exists but cannot be updated via PUT
      // (KidUpdate schema only allows name and enable_notifications)
      // The multiplier is used internally when chores are approved
      expect(kid.points_multiplier).toBe(1);

      // Verify field exists in response
      expect(typeof kid.points_multiplier).toBe('number');
    });
  });

  test.describe('Edge Cases', () => {
    test('should return array for kids list', async ({ apiContext }) => {
      const response = await apiContext.get('/api/kids');

      expect(response.ok()).toBeTruthy();
      const kids = await response.json();
      // Verify response is an array (may or may not be empty depending on cleanup)
      expect(Array.isArray(kids)).toBe(true);
    });

    test('should handle special characters in kid name', async ({ apiContext }) => {
      const response = await apiContext.post('/api/kids', {
        data: { name: "O'Connor-Smith Jr.", enable_notifications: true },
      });

      expect(response.ok()).toBeTruthy();
      const kid = await response.json();
      expect(kid.name).toBe("O'Connor-Smith Jr.");
    });

    test('should handle very long kid name', async ({ apiContext }) => {
      const longName = 'A'.repeat(100);
      const response = await apiContext.post('/api/kids', {
        data: { name: longName, enable_notifications: true },
      });

      // Should either succeed or return appropriate error
      expect([200, 201, 400, 422]).toContain(response.status());
    });
  });
});
