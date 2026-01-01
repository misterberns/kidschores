import { test, expect } from '../fixtures/test-database';
import { TestData } from '../fixtures/test-data';

test.describe('Parents API', () => {
  let kidId: string;

  test.beforeEach(async ({ apiContext, resetDatabase }) => {
    await resetDatabase();

    // Create a test kid for parent association
    const kidResp = await apiContext.post('/api/kids', { data: TestData.kid.emma() });
    const kid = await kidResp.json();
    kidId = kid.id;
  });

  test.describe('CRUD Operations', () => {
    test('should create a new parent', async ({ apiContext }) => {
      const parentData = TestData.parent.mom([kidId]);

      const response = await apiContext.post('/api/parents', { data: parentData });

      expect(response.ok()).toBeTruthy();
      const parent = await response.json();
      expect(parent.name).toBe('Mom');
      expect(parent.associated_kids).toContain(kidId);
      expect(parent.id).toBeDefined();
      expect(parent.created_at).toBeDefined();
    });

    test('should create parent without PIN', async ({ apiContext }) => {
      const response = await apiContext.post('/api/parents', {
        data: {
          name: 'Grandma',
          associated_kids: [kidId],
          enable_notifications: true,
        },
      });

      expect(response.ok()).toBeTruthy();
      const parent = await response.json();
      expect(parent.name).toBe('Grandma');
      // PIN should be null or undefined
      expect(parent.pin).toBeFalsy();
    });

    test('should list all parents', async ({ apiContext }) => {
      await apiContext.post('/api/parents', { data: TestData.parent.mom([kidId]) });
      await apiContext.post('/api/parents', { data: TestData.parent.dad([kidId]) });

      const response = await apiContext.get('/api/parents');

      expect(response.ok()).toBeTruthy();
      const parents = await response.json();
      expect(parents).toHaveLength(2);
    });

    test('should get a parent by ID', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/parents', {
        data: TestData.parent.mom([kidId]),
      });
      const created = await createResp.json();

      const response = await apiContext.get(`/api/parents/${created.id}`);

      expect(response.ok()).toBeTruthy();
      const parent = await response.json();
      expect(parent.id).toBe(created.id);
      expect(parent.name).toBe('Mom');
    });

    test('should update a parent', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/parents', {
        data: TestData.parent.mom([kidId]),
      });
      const created = await createResp.json();

      const response = await apiContext.put(`/api/parents/${created.id}`, {
        data: {
          name: 'Mommy',
          enable_notifications: false,
        },
      });

      expect(response.ok()).toBeTruthy();
      const updated = await response.json();
      expect(updated.name).toBe('Mommy');
      expect(updated.enable_notifications).toBe(false);
    });

    test('should delete a parent', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/parents', {
        data: TestData.parent.mom([kidId]),
      });
      const created = await createResp.json();

      const deleteResp = await apiContext.delete(`/api/parents/${created.id}`);
      expect(deleteResp.ok()).toBeTruthy();

      // Verify parent is gone
      const getResp = await apiContext.get(`/api/parents/${created.id}`);
      expect(getResp.status()).toBe(404);
    });
  });

  test.describe('PIN Verification', () => {
    test('should verify correct PIN', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/parents', {
        data: {
          ...TestData.parent.mom([kidId]),
          pin: '1234',
        },
      });
      const parent = await createResp.json();

      // PIN is passed as query parameter
      const response = await apiContext.post(`/api/parents/${parent.id}/verify-pin?pin=1234`);

      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      expect(result.valid).toBe(true);
    });

    test('should reject incorrect PIN', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/parents', {
        data: {
          ...TestData.parent.mom([kidId]),
          pin: '1234',
        },
      });
      const parent = await createResp.json();

      // Incorrect PIN should return 401
      const response = await apiContext.post(`/api/parents/${parent.id}/verify-pin?pin=9999`);

      expect(response.status()).toBe(401);
    });

    test('should handle PIN verification when no PIN set', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/parents', {
        data: {
          name: 'Grandma',
          associated_kids: [kidId],
        },
      });
      const parent = await createResp.json();

      // When no PIN is set, any PIN should be accepted
      const response = await apiContext.post(`/api/parents/${parent.id}/verify-pin?pin=1234`);

      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      expect(result.valid).toBe(true);
    });

    test('should update PIN', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/parents', {
        data: {
          ...TestData.parent.mom([kidId]),
          pin: '1234',
        },
      });
      const parent = await createResp.json();

      // Update PIN via PUT with full parent data (API requires ParentCreate schema)
      await apiContext.put(`/api/parents/${parent.id}`, {
        data: {
          name: parent.name,
          pin: '5678',
          associated_kids: parent.associated_kids,
          enable_notifications: parent.enable_notifications,
        },
      });

      // Verify old PIN fails (returns 401)
      const oldPinResp = await apiContext.post(`/api/parents/${parent.id}/verify-pin?pin=1234`);
      expect(oldPinResp.status()).toBe(401);

      // Verify new PIN works
      const newPinResp = await apiContext.post(`/api/parents/${parent.id}/verify-pin?pin=5678`);
      expect(newPinResp.ok()).toBeTruthy();
      const newResult = await newPinResp.json();
      expect(newResult.valid).toBe(true);
    });
  });

  test.describe('Associated Kids', () => {
    test('should associate parent with multiple kids', async ({ apiContext }) => {
      const kid2Resp = await apiContext.post('/api/kids', { data: TestData.kid.jack() });
      const kid2 = await kid2Resp.json();

      const response = await apiContext.post('/api/parents', {
        data: {
          name: 'Mom',
          associated_kids: [kidId, kid2.id],
          enable_notifications: true,
        },
      });

      expect(response.ok()).toBeTruthy();
      const parent = await response.json();
      expect(parent.associated_kids).toHaveLength(2);
      expect(parent.associated_kids).toContain(kidId);
      expect(parent.associated_kids).toContain(kid2.id);
    });

    test('should update associated kids', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/parents', {
        data: TestData.parent.mom([kidId]),
      });
      const parent = await createResp.json();

      // Create a new kid
      const kid2Resp = await apiContext.post('/api/kids', { data: TestData.kid.jack() });
      const kid2 = await kid2Resp.json();

      // Update to include new kid (API requires full ParentCreate schema)
      const response = await apiContext.put(`/api/parents/${parent.id}`, {
        data: {
          name: parent.name,
          associated_kids: [kidId, kid2.id],
          enable_notifications: parent.enable_notifications,
        },
      });

      expect(response.ok()).toBeTruthy();
      const updated = await response.json();
      expect(updated.associated_kids).toHaveLength(2);
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle empty parents list', async ({ apiContext }) => {
      const response = await apiContext.get('/api/parents');

      expect(response.ok()).toBeTruthy();
      const parents = await response.json();
      expect(parents).toEqual([]);
    });

    test('should return 404 for non-existent parent', async ({ apiContext }) => {
      const response = await apiContext.get('/api/parents/non-existent-id');
      expect(response.status()).toBe(404);
    });

    test('should handle parent with no associated kids', async ({ apiContext }) => {
      const response = await apiContext.post('/api/parents', {
        data: {
          name: 'Grandpa',
          associated_kids: [],
          enable_notifications: true,
        },
      });

      expect(response.ok()).toBeTruthy();
      const parent = await response.json();
      expect(parent.associated_kids).toEqual([]);
    });
  });
});
