import { test, expect } from '../fixtures/test-database';
import { TestData } from '../fixtures/test-data';

test.describe('Chores API', () => {
  let kidId: string;

  test.beforeEach(async ({ apiContext, resetDatabase }) => {
    await resetDatabase();

    // Create a test kid for chore assignment
    const kidResp = await apiContext.post('/api/kids', { data: TestData.kid.emma() });
    const kid = await kidResp.json();
    kidId = kid.id;
  });

  test.describe('CRUD Operations', () => {
    test('should create a new chore', async ({ apiContext }) => {
      const choreData = TestData.chore.cleanRoom([kidId]);

      const response = await apiContext.post('/api/chores', { data: choreData });

      expect(response.ok()).toBeTruthy();
      const chore = await response.json();
      expect(chore.name).toBe('Clean Room');
      expect(chore.default_points).toBe(25);
      expect(chore.assigned_kids).toContain(kidId);
      expect(chore.id).toBeDefined();
    });

    test('should list all chores', async ({ apiContext }) => {
      const chore1 = await apiContext.post('/api/chores', { data: TestData.chore.cleanRoom([kidId]) });
      const chore2 = await apiContext.post('/api/chores', { data: TestData.chore.doHomework([kidId]) });
      const chore1Id = (await chore1.json()).id;
      const chore2Id = (await chore2.json()).id;

      const response = await apiContext.get('/api/chores');

      expect(response.ok()).toBeTruthy();
      const chores = await response.json();
      // Verify at least our created chores are present
      expect(chores.length).toBeGreaterThanOrEqual(2);
      expect(chores.some((c: any) => c.id === chore1Id)).toBe(true);
      expect(chores.some((c: any) => c.id === chore2Id)).toBe(true);
    });

    test('should get a chore by ID', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/chores', {
        data: TestData.chore.cleanRoom([kidId]),
      });
      const created = await createResp.json();

      const response = await apiContext.get(`/api/chores/${created.id}`);

      expect(response.ok()).toBeTruthy();
      const chore = await response.json();
      expect(chore.id).toBe(created.id);
      expect(chore.name).toBe('Clean Room');
    });

    test('should update a chore', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/chores', {
        data: TestData.chore.cleanRoom([kidId]),
      });
      const created = await createResp.json();

      const response = await apiContext.put(`/api/chores/${created.id}`, {
        data: {
          name: 'Clean Bedroom',
          default_points: 30,
          recurring_frequency: 'weekly',
        },
      });

      expect(response.ok()).toBeTruthy();
      const updated = await response.json();
      expect(updated.name).toBe('Clean Bedroom');
      expect(updated.default_points).toBe(30);
      expect(updated.recurring_frequency).toBe('weekly');
    });

    test('should delete a chore', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/chores', {
        data: TestData.chore.cleanRoom([kidId]),
      });
      const created = await createResp.json();

      const deleteResp = await apiContext.delete(`/api/chores/${created.id}`);
      expect(deleteResp.ok()).toBeTruthy();

      // Verify chore is gone
      const getResp = await apiContext.get(`/api/chores/${created.id}`);
      expect(getResp.status()).toBe(404);
    });
  });

  test.describe('Claim Workflow', () => {
    test('should claim a chore', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/chores', {
        data: TestData.chore.cleanRoom([kidId]),
      });
      const chore = await createResp.json();

      const response = await apiContext.post(`/api/chores/${chore.id}/claim`, {
        data: { kid_id: kidId },
      });

      expect(response.ok()).toBeTruthy();
      const claim = await response.json();
      expect(claim.status).toBe('claimed');
      expect(claim.kid_id).toBe(kidId);
    });

    test('should prevent duplicate claims when not allowed', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/chores', {
        data: {
          ...TestData.chore.cleanRoom([kidId]),
          allow_multiple_claims_per_day: false,
        },
      });
      const chore = await createResp.json();

      // First claim
      await apiContext.post(`/api/chores/${chore.id}/claim`, { data: { kid_id: kidId } });

      // Second claim should fail
      const response = await apiContext.post(`/api/chores/${chore.id}/claim`, {
        data: { kid_id: kidId },
      });

      expect(response.status()).toBe(400);
    });

    test('should allow multiple claims when enabled', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/chores', {
        data: {
          ...TestData.chore.cleanRoom([kidId]),
          allow_multiple_claims_per_day: true,
        },
      });
      const chore = await createResp.json();

      // First claim and approve
      await apiContext.post(`/api/chores/${chore.id}/claim`, { data: { kid_id: kidId } });
      await apiContext.post(`/api/chores/${chore.id}/approve`, { data: { parent_name: 'Mom' } });

      // Second claim should succeed
      const response = await apiContext.post(`/api/chores/${chore.id}/claim`, {
        data: { kid_id: kidId },
      });

      expect(response.ok()).toBeTruthy();
    });

    test('should prevent unassigned kid from claiming', async ({ apiContext }) => {
      // Create another kid not assigned to the chore
      const kid2Resp = await apiContext.post('/api/kids', { data: TestData.kid.jack() });
      const kid2 = await kid2Resp.json();

      const createResp = await apiContext.post('/api/chores', {
        data: TestData.chore.cleanRoom([kidId]), // Only Emma is assigned
      });
      const chore = await createResp.json();

      // Jack tries to claim
      const response = await apiContext.post(`/api/chores/${chore.id}/claim`, {
        data: { kid_id: kid2.id },
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe('Approval Workflow', () => {
    test('should approve a claimed chore and award points', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/chores', {
        data: TestData.chore.cleanRoom([kidId]), // 25 points
      });
      const chore = await createResp.json();

      // Claim
      await apiContext.post(`/api/chores/${chore.id}/claim`, { data: { kid_id: kidId } });

      // Approve
      const response = await apiContext.post(`/api/chores/${chore.id}/approve`, {
        data: { parent_name: 'Mom' },
      });

      expect(response.ok()).toBeTruthy();
      const claim = await response.json();
      expect(claim.status).toBe('approved');
      expect(claim.points_awarded).toBe(25);

      // Verify kid got points
      const kidResp = await apiContext.get(`/api/kids/${kidId}`);
      const kid = await kidResp.json();
      expect(kid.points).toBe(25);
      expect(kid.completed_chores_total).toBe(1);
    });

    test('should approve with custom points', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/chores', {
        data: TestData.chore.cleanRoom([kidId]),
      });
      const chore = await createResp.json();

      await apiContext.post(`/api/chores/${chore.id}/claim`, { data: { kid_id: kidId } });

      // Approve with custom points (bonus!)
      const response = await apiContext.post(`/api/chores/${chore.id}/approve`, {
        data: { parent_name: 'Mom', points_awarded: 50 },
      });

      expect(response.ok()).toBeTruthy();
      const claim = await response.json();
      expect(claim.points_awarded).toBe(50);

      // Verify custom points awarded
      const kidResp = await apiContext.get(`/api/kids/${kidId}`);
      const kid = await kidResp.json();
      expect(kid.points).toBe(50);
    });

    test('should disapprove a claimed chore without awarding points', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/chores', {
        data: TestData.chore.cleanRoom([kidId]),
      });
      const chore = await createResp.json();

      await apiContext.post(`/api/chores/${chore.id}/claim`, { data: { kid_id: kidId } });

      const response = await apiContext.post(`/api/chores/${chore.id}/disapprove`, {
        data: { parent_name: 'Mom' },
      });

      expect(response.ok()).toBeTruthy();

      // Verify kid has no points
      const kidResp = await apiContext.get(`/api/kids/${kidId}`);
      const kid = await kidResp.json();
      expect(kid.points).toBe(0);
      expect(kid.completed_chores_total).toBe(0);
    });

    test('points are awarded based on chore default_points', async ({ apiContext }) => {
      // Note: points_multiplier cannot be updated via PUT (KidUpdate schema limitation)
      // The multiplier is applied internally but defaults to 1.0
      const createResp = await apiContext.post('/api/chores', {
        data: {
          ...TestData.chore.cleanRoom([kidId]),
          default_points: 20,
        },
      });
      const chore = await createResp.json();

      await apiContext.post(`/api/chores/${chore.id}/claim`, { data: { kid_id: kidId } });
      await apiContext.post(`/api/chores/${chore.id}/approve`, { data: { parent_name: 'Mom' } });

      // Verify points match default (multiplier is 1.0)
      const kidResp = await apiContext.get(`/api/kids/${kidId}`);
      const kid = await kidResp.json();
      expect(kid.points).toBe(20);
    });
  });

  test.describe('Scheduling Fields', () => {
    test('should create chore with recurring frequency', async ({ apiContext }) => {
      const response = await apiContext.post('/api/chores', {
        data: {
          ...TestData.chore.cleanRoom([kidId]),
          recurring_frequency: 'daily',
        },
      });

      expect(response.ok()).toBeTruthy();
      const chore = await response.json();
      expect(chore.recurring_frequency).toBe('daily');
    });

    test('should create chore with applicable days', async ({ apiContext }) => {
      const response = await apiContext.post('/api/chores', {
        data: {
          ...TestData.chore.cleanRoom([kidId]),
          applicable_days: [1, 2, 3, 4, 5], // Mon-Fri
        },
      });

      expect(response.ok()).toBeTruthy();
      const chore = await response.json();
      expect(chore.applicable_days).toEqual([1, 2, 3, 4, 5]);
    });

    test('should update recurring frequency', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/chores', {
        data: TestData.chore.cleanRoom([kidId]),
      });
      const chore = await createResp.json();

      const response = await apiContext.put(`/api/chores/${chore.id}`, {
        data: {
          recurring_frequency: 'weekly',
        },
      });

      expect(response.ok()).toBeTruthy();
      const updated = await response.json();
      expect(updated.recurring_frequency).toBe('weekly');
    });
  });

  test.describe('Shared Chores', () => {
    test('should create a shared chore', async ({ apiContext }) => {
      const kid2Resp = await apiContext.post('/api/kids', { data: TestData.kid.jack() });
      const kid2 = await kid2Resp.json();

      const response = await apiContext.post('/api/chores', {
        data: {
          name: 'Clean Living Room',
          default_points: 40,
          assigned_kids: [kidId, kid2.id],
          shared_chore: true,
        },
      });

      expect(response.ok()).toBeTruthy();
      const chore = await response.json();
      expect(chore.shared_chore).toBe(true);
      expect(chore.assigned_kids).toHaveLength(2);
    });
  });
});
