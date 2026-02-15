import { test, expect } from '../fixtures/test-database';

test.describe('Categories API', () => {
  test.beforeEach(async ({ resetDatabase }) => {
    await resetDatabase();
  });

  test.describe('CRUD Operations', () => {
    test('should create a new category', async ({ apiContext }) => {
      const categoryData = {
        name: 'Bedroom',
        icon: '🛏️',
        color: '#4f46e5',
        sort_order: 1,
      };

      const response = await apiContext.post('/api/categories', { data: categoryData });

      expect(response.ok()).toBeTruthy();
      const category = await response.json();
      expect(category.name).toBe('Bedroom');
      expect(category.icon).toBe('🛏️');
      expect(category.color).toBe('#4f46e5');
      expect(category.sort_order).toBe(1);
      expect(category.id).toBeDefined();
    });

    test('should list all categories', async ({ apiContext }) => {
      await apiContext.post('/api/categories', {
        data: { name: 'Kitchen', icon: '🍳', color: '#ef4444', sort_order: 1 },
      });
      await apiContext.post('/api/categories', {
        data: { name: 'Bathroom', icon: '🚿', color: '#3b82f6', sort_order: 2 },
      });

      const response = await apiContext.get('/api/categories');

      expect(response.ok()).toBeTruthy();
      const categories = await response.json();
      expect(categories.length).toBeGreaterThanOrEqual(2);
    });

    test('should get a category by ID', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/categories', {
        data: { name: 'Outdoor', icon: '🌳', color: '#22c55e', sort_order: 1 },
      });
      const created = await createResp.json();

      const response = await apiContext.get(`/api/categories/${created.id}`);

      expect(response.ok()).toBeTruthy();
      const category = await response.json();
      expect(category.id).toBe(created.id);
      expect(category.name).toBe('Outdoor');
    });

    test('should update a category', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/categories', {
        data: { name: 'School', icon: '📚', color: '#8b5cf6', sort_order: 1 },
      });
      const created = await createResp.json();

      const response = await apiContext.put(`/api/categories/${created.id}`, {
        data: { name: 'Homework', icon: '✏️', color: '#f59e0b' },
      });

      expect(response.ok()).toBeTruthy();
      const updated = await response.json();
      expect(updated.name).toBe('Homework');
      expect(updated.icon).toBe('✏️');
      expect(updated.color).toBe('#f59e0b');
    });

    test('should delete a category', async ({ apiContext }) => {
      const createResp = await apiContext.post('/api/categories', {
        data: { name: 'Pet Care', icon: '🐕', color: '#ec4899', sort_order: 1 },
      });
      const created = await createResp.json();

      const deleteResp = await apiContext.delete(`/api/categories/${created.id}`);
      expect(deleteResp.ok()).toBeTruthy();

      const getResp = await apiContext.get(`/api/categories/${created.id}`);
      expect(getResp.status()).toBe(404);
    });
  });

  test.describe('Predefined Categories', () => {
    test('should get predefined categories', async ({ apiContext }) => {
      const response = await apiContext.get('/api/categories/predefined');

      expect(response.ok()).toBeTruthy();
      const predefined = await response.json();
      expect(Array.isArray(predefined)).toBe(true);
      expect(predefined.length).toBeGreaterThan(0);
      expect(predefined[0]).toHaveProperty('name');
      expect(predefined[0]).toHaveProperty('icon');
      expect(predefined[0]).toHaveProperty('color');
    });

    test('should seed default categories', async ({ apiContext }) => {
      const response = await apiContext.post('/api/categories/seed-defaults');

      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      expect(result.created).toBeGreaterThan(0);

      // Verify categories were created
      const listResp = await apiContext.get('/api/categories');
      const categories = await listResp.json();
      expect(categories.length).toBeGreaterThanOrEqual(result.created);
    });
  });

  test.describe('Reordering', () => {
    test('should reorder categories', async ({ apiContext }) => {
      const cat1Resp = await apiContext.post('/api/categories', {
        data: { name: 'First', icon: '1️⃣', color: '#ef4444', sort_order: 1 },
      });
      const cat1 = await cat1Resp.json();

      const cat2Resp = await apiContext.post('/api/categories', {
        data: { name: 'Second', icon: '2️⃣', color: '#3b82f6', sort_order: 2 },
      });
      const cat2 = await cat2Resp.json();

      // Move cat2 to position 1
      const response = await apiContext.put(`/api/categories/${cat2.id}/reorder?new_order=1`);

      expect(response.ok()).toBeTruthy();
      const updated = await response.json();
      expect(updated.sort_order).toBe(1);
    });
  });

  test.describe('Chore Association', () => {
    test('should associate category with chore', async ({ apiContext }) => {
      // Create a category
      const catResp = await apiContext.post('/api/categories', {
        data: { name: 'Living Room', icon: '🛋️', color: '#6366f1', sort_order: 1 },
      });
      const category = await catResp.json();

      // Create a kid
      const kidResp = await apiContext.post('/api/kids', {
        data: { name: 'TestKid', enable_notifications: false },
      });
      const kid = await kidResp.json();

      // Create a chore with category
      const choreResp = await apiContext.post('/api/chores', {
        data: {
          name: 'Vacuum Floor',
          default_points: 20,
          assigned_kids: [kid.id],
          category_id: category.id,
        },
      });
      const chore = await choreResp.json();

      expect(chore.category_id).toBe(category.id);

      // Verify category shows chore count
      const catGetResp = await apiContext.get(`/api/categories/${category.id}`);
      const updatedCat = await catGetResp.json();
      expect(updatedCat.chore_count).toBeGreaterThanOrEqual(1);
    });
  });
});
