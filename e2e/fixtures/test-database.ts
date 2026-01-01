import { test as base, APIRequestContext } from '@playwright/test';

// API URL - use deployed instance
const DEPLOYED_URL = 'https://localhost:3103';
const API_URL = process.env.API_URL || DEPLOYED_URL;

/**
 * Extended test fixtures for KidsChores E2E tests
 */
export interface TestFixtures {
  /** API request context for making HTTP requests */
  apiContext: APIRequestContext;
  /** Reset database to clean state before test */
  resetDatabase: () => Promise<void>;
}

/**
 * Extended test with custom fixtures
 */
export const test = base.extend<TestFixtures>({
  // Create an API context for making requests
  apiContext: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({
      baseURL: API_URL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
      },
      ignoreHTTPSErrors: true, // Accept self-signed certificates
    });
    await use(context);
    await context.dispose();
  },

  // Database reset fixture - uses API cleanup for deployed instance
  resetDatabase: async ({ apiContext }, use) => {
    const reset = async () => {
      // Clean up via API - delete all entities in correct order
      // (rewards first since they may reference kids, then chores, then kids, then parents)

      try {
        // Delete all rewards
        const rewardsResp = await apiContext.get('/api/rewards');
        if (rewardsResp.ok()) {
          const rewards = await rewardsResp.json();
          for (const reward of rewards) {
            await apiContext.delete(`/api/rewards/${reward.id}`);
          }
        }

        // Delete all chores
        const choresResp = await apiContext.get('/api/chores');
        if (choresResp.ok()) {
          const chores = await choresResp.json();
          for (const chore of chores) {
            await apiContext.delete(`/api/chores/${chore.id}`);
          }
        }

        // Delete all kids
        const kidsResp = await apiContext.get('/api/kids');
        if (kidsResp.ok()) {
          const kids = await kidsResp.json();
          for (const kid of kids) {
            await apiContext.delete(`/api/kids/${kid.id}`);
          }
        }

        // Delete all parents
        const parentsResp = await apiContext.get('/api/parents');
        if (parentsResp.ok()) {
          const parents = await parentsResp.json();
          for (const parent of parents) {
            await apiContext.delete(`/api/parents/${parent.id}`);
          }
        }
      } catch (error) {
        console.log('Error during API cleanup:', error);
      }

      // Small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 50));
    };

    // Reset before test starts
    await reset();

    // Provide reset function to test (can call again if needed)
    await use(reset);
  },
});

// Re-export expect for convenience
export { expect } from '@playwright/test';
