import { test, expect } from '../fixtures/test-database';
import { TestData } from '../fixtures/test-data';

test.describe('Allowance API', () => {
  let kidId: string;

  test.beforeEach(async ({ apiContext, resetDatabase }) => {
    await resetDatabase();

    // Create a test kid with some points
    const kidResp = await apiContext.post('/api/kids', { data: TestData.kid.emma() });
    const kid = await kidResp.json();
    kidId = kid.id;

    // Add some points to the kid
    await apiContext.post(`/api/kids/${kidId}/points`, { data: { points: 500 } });
  });

  test.describe('Settings', () => {
    test('should get default allowance settings', async ({ apiContext }) => {
      const response = await apiContext.get(`/api/allowance/settings/${kidId}`);

      expect(response.ok()).toBeTruthy();
      const settings = await response.json();
      expect(settings.kid_id).toBe(kidId);
      expect(settings.points_per_dollar).toBe(100); // Default
      expect(settings.auto_payout).toBe(false);
      expect(settings.minimum_payout).toBe(100); // Default $1.00 minimum
    });

    test('should update allowance settings', async ({ apiContext }) => {
      const response = await apiContext.put(`/api/allowance/settings/${kidId}`, {
        data: {
          points_per_dollar: 50,
          auto_payout: true,
          payout_day: 6, // Saturday
          minimum_payout: 200,
        },
      });

      expect(response.ok()).toBeTruthy();
      const settings = await response.json();
      expect(settings.points_per_dollar).toBe(50);
      expect(settings.auto_payout).toBe(true);
      expect(settings.payout_day).toBe(6);
      expect(settings.minimum_payout).toBe(200);
    });

    test('should calculate dollar equivalent correctly', async ({ apiContext }) => {
      // Default is 100 points per dollar, kid has 500 points = $5.00
      const response = await apiContext.get(`/api/allowance/settings/${kidId}`);

      expect(response.ok()).toBeTruthy();
      const settings = await response.json();
      expect(settings.kid_points).toBe(500);
      expect(settings.dollar_equivalent).toBe(5.0);
    });

    test('should recalculate with custom rate', async ({ apiContext }) => {
      // Set 50 points per dollar, so 500 points = $10.00
      await apiContext.put(`/api/allowance/settings/${kidId}`, {
        data: { points_per_dollar: 50 },
      });

      const response = await apiContext.get(`/api/allowance/settings/${kidId}`);
      const settings = await response.json();
      expect(settings.dollar_equivalent).toBe(10.0);
    });
  });

  test.describe('Payout Requests', () => {
    test('should request a payout', async ({ apiContext }) => {
      const response = await apiContext.post(`/api/allowance/convert/${kidId}`, {
        data: {
          points_to_convert: 200,
          payout_method: 'cash',
          notes: 'Saving for a toy',
        },
      });

      expect(response.ok()).toBeTruthy();
      const payout = await response.json();
      expect(payout.kid_id).toBe(kidId);
      expect(payout.points_converted).toBe(200);
      expect(payout.dollar_amount).toBe(2.0); // 200 / 100 = $2.00
      expect(payout.payout_method).toBe('cash');
      expect(payout.status).toBe('pending');
      expect(payout.notes).toBe('Saving for a toy');

      // Verify points were deducted
      const kidResp = await apiContext.get(`/api/kids/${kidId}`);
      const kid = await kidResp.json();
      expect(kid.points).toBe(300); // 500 - 200 = 300
    });

    test('should reject insufficient points', async ({ apiContext }) => {
      const response = await apiContext.post(`/api/allowance/convert/${kidId}`, {
        data: { points_to_convert: 1000 }, // Kid only has 500
      });

      expect(response.status()).toBe(400);
    });

    test('should reject below minimum payout', async ({ apiContext }) => {
      // Minimum is 100 points by default ($1.00)
      const response = await apiContext.post(`/api/allowance/convert/${kidId}`, {
        data: { points_to_convert: 50 },
      });

      expect(response.status()).toBe(400);
    });

    test('should get payout history for kid', async ({ apiContext }) => {
      // Create some payouts
      await apiContext.post(`/api/allowance/convert/${kidId}`, {
        data: { points_to_convert: 100 },
      });
      await apiContext.post(`/api/allowance/convert/${kidId}`, {
        data: { points_to_convert: 150 },
      });

      const response = await apiContext.get(`/api/allowance/payouts/${kidId}`);

      expect(response.ok()).toBeTruthy();
      const payouts = await response.json();
      expect(payouts.length).toBe(2);
    });

    test('should filter payouts by status', async ({ apiContext }) => {
      const payout1Resp = await apiContext.post(`/api/allowance/convert/${kidId}`, {
        data: { points_to_convert: 100 },
      });
      const payout1 = await payout1Resp.json();

      await apiContext.post(`/api/allowance/convert/${kidId}`, {
        data: { points_to_convert: 100 },
      });

      // Mark first as paid
      await apiContext.post(`/api/allowance/payouts/${payout1.id}/pay`, {
        data: { paid_by: 'Dad' },
      });

      // Filter for pending only
      const response = await apiContext.get(`/api/allowance/payouts/${kidId}?status=pending`);
      const payouts = await response.json();
      expect(payouts.length).toBe(1);
    });
  });

  test.describe('Payout Management', () => {
    test('should get all pending payouts', async ({ apiContext }) => {
      // Create another kid with payouts
      const kid2Resp = await apiContext.post('/api/kids', { data: TestData.kid.jack() });
      const kid2 = await kid2Resp.json();
      await apiContext.post(`/api/kids/${kid2.id}/points`, { data: { points: 300 } });

      // Create pending payouts for both kids
      await apiContext.post(`/api/allowance/convert/${kidId}`, {
        data: { points_to_convert: 100 },
      });
      await apiContext.post(`/api/allowance/convert/${kid2.id}`, {
        data: { points_to_convert: 100 },
      });

      const response = await apiContext.get('/api/allowance/pending');

      expect(response.ok()).toBeTruthy();
      const payouts = await response.json();
      expect(payouts.length).toBe(2);
    });

    test('should mark payout as paid', async ({ apiContext }) => {
      const createResp = await apiContext.post(`/api/allowance/convert/${kidId}`, {
        data: { points_to_convert: 200 },
      });
      const payout = await createResp.json();

      const response = await apiContext.post(`/api/allowance/payouts/${payout.id}/pay`, {
        data: { paid_by: 'Mom', notes: 'Paid in cash' },
      });

      expect(response.ok()).toBeTruthy();
      const updated = await response.json();
      expect(updated.status).toBe('paid');
      expect(updated.paid_by).toBe('Mom');
      expect(updated.notes).toBe('Paid in cash');
      expect(updated.paid_at).toBeDefined();
    });

    test('should cancel a payout and refund points', async ({ apiContext }) => {
      const createResp = await apiContext.post(`/api/allowance/convert/${kidId}`, {
        data: { points_to_convert: 200 },
      });
      const payout = await createResp.json();

      // Kid should have 300 points after deduction
      let kidResp = await apiContext.get(`/api/kids/${kidId}`);
      let kid = await kidResp.json();
      expect(kid.points).toBe(300);

      // Cancel payout
      const response = await apiContext.post(`/api/allowance/payouts/${payout.id}/cancel`);

      expect(response.ok()).toBeTruthy();
      const updated = await response.json();
      expect(updated.status).toBe('cancelled');

      // Points should be refunded
      kidResp = await apiContext.get(`/api/kids/${kidId}`);
      kid = await kidResp.json();
      expect(kid.points).toBe(500);
    });

    test('should not cancel already paid payout', async ({ apiContext }) => {
      const createResp = await apiContext.post(`/api/allowance/convert/${kidId}`, {
        data: { points_to_convert: 100 },
      });
      const payout = await createResp.json();

      // Mark as paid
      await apiContext.post(`/api/allowance/payouts/${payout.id}/pay`, {
        data: { paid_by: 'Dad' },
      });

      // Try to cancel
      const response = await apiContext.post(`/api/allowance/payouts/${payout.id}/cancel`);
      expect(response.status()).toBe(400);
    });
  });

  test.describe('Summary', () => {
    test('should get allowance summary', async ({ apiContext }) => {
      // Create and complete some payouts
      const payout1Resp = await apiContext.post(`/api/allowance/convert/${kidId}`, {
        data: { points_to_convert: 100 },
      });
      const payout1 = await payout1Resp.json();
      await apiContext.post(`/api/allowance/payouts/${payout1.id}/pay`, {
        data: { paid_by: 'Mom' },
      });

      await apiContext.post(`/api/allowance/convert/${kidId}`, {
        data: { points_to_convert: 150 },
      });

      const response = await apiContext.get(`/api/allowance/summary/${kidId}`);

      expect(response.ok()).toBeTruthy();
      const summary = await response.json();
      expect(summary.kid_id).toBe(kidId);
      expect(summary.current_points).toBe(250); // 500 - 100 - 150
      expect(summary.pending_payouts).toBe(1);
      expect(summary.pending_amount).toBe(1.5); // 150 points / 100 = $1.50
      expect(summary.total_paid).toBe(1.0); // 100 points / 100 = $1.00
      expect(summary.total_paid_count).toBe(1);
    });
  });
});
