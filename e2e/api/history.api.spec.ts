import { test, expect } from '../fixtures/test-database';
import { TestData } from '../fixtures/test-data';

test.describe('History API', () => {
  let kidId: string;
  let choreId: string;

  test.beforeEach(async ({ apiContext, resetDatabase }) => {
    await resetDatabase();

    // Create a test kid
    const kidResp = await apiContext.post('/api/kids', { data: TestData.kid.emma() });
    const kid = await kidResp.json();
    kidId = kid.id;

    // Create a test chore
    const choreResp = await apiContext.post('/api/chores', {
      data: TestData.chore.cleanRoom([kidId]),
    });
    const chore = await choreResp.json();
    choreId = chore.id;
  });

  test.describe('History Retrieval', () => {
    test('should get empty history for new kid', async ({ apiContext }) => {
      const response = await apiContext.get(`/api/history/${kidId}`);

      expect(response.ok()).toBeTruthy();
      const history = await response.json();
      expect(history.items).toHaveLength(0);
      expect(history.total).toBe(0);
      expect(history.page).toBe(1);
      expect(history.has_more).toBe(false);
    });

    test('should get history with completed chores', async ({ apiContext }) => {
      // Claim and approve a chore
      await apiContext.post(`/api/chores/${choreId}/claim`, { data: { kid_id: kidId } });
      await apiContext.post(`/api/chores/${choreId}/approve`, { data: { parent_name: 'Mom' } });

      const response = await apiContext.get(`/api/history/${kidId}`);

      expect(response.ok()).toBeTruthy();
      const history = await response.json();
      expect(history.items.length).toBe(1);
      expect(history.items[0].chore_name).toBe('Clean Room');
      expect(history.items[0].status).toBe('approved');
      expect(history.items[0].points_awarded).toBe(25);
    });

    test('should paginate history', async ({ apiContext }) => {
      // Create and complete multiple chores
      for (let i = 0; i < 25; i++) {
        const choreResp = await apiContext.post('/api/chores', {
          data: {
            name: `Chore ${i}`,
            default_points: 10,
            assigned_kids: [kidId],
            allow_multiple_claims_per_day: true,
          },
        });
        const chore = await choreResp.json();
        await apiContext.post(`/api/chores/${chore.id}/claim`, { data: { kid_id: kidId } });
        await apiContext.post(`/api/chores/${chore.id}/approve`, { data: { parent_name: 'Mom' } });
      }

      // Get first page
      const page1Resp = await apiContext.get(`/api/history/${kidId}?page=1&per_page=10`);
      const page1 = await page1Resp.json();
      expect(page1.items.length).toBe(10);
      expect(page1.total).toBe(25);
      expect(page1.page).toBe(1);
      expect(page1.has_more).toBe(true);

      // Get second page
      const page2Resp = await apiContext.get(`/api/history/${kidId}?page=2&per_page=10`);
      const page2 = await page2Resp.json();
      expect(page2.items.length).toBe(10);
      expect(page2.page).toBe(2);
      expect(page2.has_more).toBe(true);

      // Get third page
      const page3Resp = await apiContext.get(`/api/history/${kidId}?page=3&per_page=10`);
      const page3 = await page3Resp.json();
      expect(page3.items.length).toBe(5);
      expect(page3.page).toBe(3);
      expect(page3.has_more).toBe(false);
    });

    test('should filter history by status', async ({ apiContext }) => {
      // Create an approved and a claimed (pending) chore
      await apiContext.post(`/api/chores/${choreId}/claim`, { data: { kid_id: kidId } });
      await apiContext.post(`/api/chores/${choreId}/approve`, { data: { parent_name: 'Mom' } });

      const chore2Resp = await apiContext.post('/api/chores', {
        data: {
          name: 'Pending Chore',
          default_points: 15,
          assigned_kids: [kidId],
        },
      });
      const chore2 = await chore2Resp.json();
      await apiContext.post(`/api/chores/${chore2.id}/claim`, { data: { kid_id: kidId } });

      // Filter for approved only
      const approvedResp = await apiContext.get(`/api/history/${kidId}?status=approved`);
      const approved = await approvedResp.json();
      expect(approved.items.length).toBe(1);
      expect(approved.items[0].status).toBe('approved');

      // Filter for claimed only
      const claimedResp = await apiContext.get(`/api/history/${kidId}?status=claimed`);
      const claimed = await claimedResp.json();
      expect(claimed.items.length).toBe(1);
      expect(claimed.items[0].status).toBe('claimed');
    });

    test('should filter history by category', async ({ apiContext }) => {
      // Create a category
      const catResp = await apiContext.post('/api/categories', {
        data: { name: 'Kitchen', icon: '🍳', color: '#ef4444', sort_order: 1 },
      });
      const category = await catResp.json();

      // Create chore with category
      const choreWithCatResp = await apiContext.post('/api/chores', {
        data: {
          name: 'Wash Dishes',
          default_points: 20,
          assigned_kids: [kidId],
          category_id: category.id,
        },
      });
      const choreWithCat = await choreWithCatResp.json();

      // Complete both chores
      await apiContext.post(`/api/chores/${choreId}/claim`, { data: { kid_id: kidId } });
      await apiContext.post(`/api/chores/${choreId}/approve`, { data: { parent_name: 'Mom' } });

      await apiContext.post(`/api/chores/${choreWithCat.id}/claim`, { data: { kid_id: kidId } });
      await apiContext.post(`/api/chores/${choreWithCat.id}/approve`, { data: { parent_name: 'Mom' } });

      // Filter by category
      const response = await apiContext.get(`/api/history/${kidId}?category_id=${category.id}`);
      const history = await response.json();
      expect(history.items.length).toBe(1);
      expect(history.items[0].category_name).toBe('Kitchen');
    });
  });

  test.describe('Analytics', () => {
    test('should get analytics for kid with no history', async ({ apiContext }) => {
      const response = await apiContext.get(`/api/history/stats/${kidId}`);

      expect(response.ok()).toBeTruthy();
      const analytics = await response.json();
      expect(analytics.kid_id).toBe(kidId);
      expect(analytics.kid_name).toBe('Emma');
      expect(analytics.total_chores_completed).toBe(0);
      expect(analytics.total_points_earned).toBe(0);
      expect(analytics.average_points_per_chore).toBe(0);
    });

    test('should calculate analytics correctly', async ({ apiContext }) => {
      // Complete a few chores
      await apiContext.post(`/api/chores/${choreId}/claim`, { data: { kid_id: kidId } });
      await apiContext.post(`/api/chores/${choreId}/approve`, { data: { parent_name: 'Mom' } });

      const chore2Resp = await apiContext.post('/api/chores', {
        data: {
          name: 'Do Homework',
          default_points: 35,
          assigned_kids: [kidId],
        },
      });
      const chore2 = await chore2Resp.json();
      await apiContext.post(`/api/chores/${chore2.id}/claim`, { data: { kid_id: kidId } });
      await apiContext.post(`/api/chores/${chore2.id}/approve`, { data: { parent_name: 'Dad' } });

      const response = await apiContext.get(`/api/history/stats/${kidId}`);

      expect(response.ok()).toBeTruthy();
      const analytics = await response.json();
      expect(analytics.total_chores_completed).toBe(2);
      expect(analytics.total_points_earned).toBe(60); // 25 + 35
      expect(analytics.average_points_per_chore).toBe(30); // 60 / 2
    });

    test('should include daily stats', async ({ apiContext }) => {
      await apiContext.post(`/api/chores/${choreId}/claim`, { data: { kid_id: kidId } });
      await apiContext.post(`/api/chores/${choreId}/approve`, { data: { parent_name: 'Mom' } });

      const response = await apiContext.get(`/api/history/stats/${kidId}?days=7`);
      const analytics = await response.json();

      expect(analytics.daily_stats).toBeDefined();
      expect(analytics.daily_stats.length).toBe(7);
      // At least one day should have a completion
      const hasCompletion = analytics.daily_stats.some((d: any) => d.completed > 0);
      expect(hasCompletion).toBe(true);
    });

    test('should include category stats', async ({ apiContext }) => {
      // Create category and chore
      const catResp = await apiContext.post('/api/categories', {
        data: { name: 'Bedroom', icon: '🛏️', color: '#4f46e5', sort_order: 1 },
      });
      const category = await catResp.json();

      const choreWithCatResp = await apiContext.post('/api/chores', {
        data: {
          name: 'Make Bed',
          default_points: 15,
          assigned_kids: [kidId],
          category_id: category.id,
        },
      });
      const choreWithCat = await choreWithCatResp.json();

      await apiContext.post(`/api/chores/${choreWithCat.id}/claim`, { data: { kid_id: kidId } });
      await apiContext.post(`/api/chores/${choreWithCat.id}/approve`, { data: { parent_name: 'Mom' } });

      const response = await apiContext.get(`/api/history/stats/${kidId}`);
      const analytics = await response.json();

      expect(analytics.category_stats).toBeDefined();
      const bedroomStats = analytics.category_stats.find((c: any) => c.category_name === 'Bedroom');
      expect(bedroomStats).toBeDefined();
      expect(bedroomStats.count).toBe(1);
      expect(bedroomStats.points).toBe(15);
    });

    test('should include top chores', async ({ apiContext }) => {
      // Complete same chore multiple times
      for (let i = 0; i < 3; i++) {
        const choreResp = await apiContext.post('/api/chores', {
          data: {
            name: 'Make Bed',
            default_points: 10,
            assigned_kids: [kidId],
          },
        });
        const chore = await choreResp.json();
        await apiContext.post(`/api/chores/${chore.id}/claim`, { data: { kid_id: kidId } });
        await apiContext.post(`/api/chores/${chore.id}/approve`, { data: { parent_name: 'Mom' } });
      }

      const response = await apiContext.get(`/api/history/stats/${kidId}`);
      const analytics = await response.json();

      expect(analytics.top_chores).toBeDefined();
      expect(analytics.top_chores.length).toBeGreaterThan(0);
      expect(analytics.top_chores[0]).toHaveProperty('chore_name');
      expect(analytics.top_chores[0]).toHaveProperty('count');
      expect(analytics.top_chores[0]).toHaveProperty('points');
    });

    test('should return 404 for non-existent kid', async ({ apiContext }) => {
      const response = await apiContext.get('/api/history/stats/non-existent-id');
      expect(response.status()).toBe(404);
    });
  });

  test.describe('CSV Export', () => {
    test('should export history as CSV', async ({ apiContext }) => {
      // Complete a chore
      await apiContext.post(`/api/chores/${choreId}/claim`, { data: { kid_id: kidId } });
      await apiContext.post(`/api/chores/${choreId}/approve`, { data: { parent_name: 'Mom' } });

      const response = await apiContext.get(`/api/history/export/${kidId}`);

      expect(response.ok()).toBeTruthy();
      expect(response.headers()['content-type']).toContain('text/csv');
      expect(response.headers()['content-disposition']).toContain('Emma_chore_history.csv');

      const csv = await response.text();
      expect(csv).toContain('Date');
      expect(csv).toContain('Chore');
      expect(csv).toContain('Clean Room');
    });

    test('should return 404 for non-existent kid export', async ({ apiContext }) => {
      const response = await apiContext.get('/api/history/export/non-existent-id');
      expect(response.status()).toBe(404);
    });
  });
});
