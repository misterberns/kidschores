import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config();

// Default URLs - use deployed instance or local dev servers
const DEPLOYED_URL = 'https://localhost:3103';
const API_URL = process.env.API_URL || DEPLOYED_URL;
const FRONTEND_URL = process.env.FRONTEND_URL || DEPLOYED_URL;

export default defineConfig({
  testDir: '.',
  fullyParallel: false, // Disable parallel for shared database isolation
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to ensure test isolation against shared database

  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list']
  ],

  // Global timeout settings
  timeout: 30000,
  expect: {
    timeout: 5000,
  },

  use: {
    baseURL: FRONTEND_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true, // Accept self-signed certs
  },

  projects: [
    // API Tests - no browser needed, faster execution
    {
      name: 'api',
      testMatch: /api\/.*\.spec\.ts/,
      use: {
        baseURL: API_URL,
      },
    },

    // Desktop Chrome - primary browser tests
    {
      name: 'chromium',
      testMatch: /(ui|workflows)\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: FRONTEND_URL,
      },
    },

    // Mobile Safari - kid-friendly UI testing
    {
      name: 'mobile-safari',
      testMatch: /(ui|workflows)\/.*\.spec\.ts/,
      use: {
        ...devices['iPhone 14'],
        baseURL: FRONTEND_URL,
      },
    },

    // Tablet - common family device
    {
      name: 'tablet',
      testMatch: /(ui|workflows)\/.*\.spec\.ts/,
      use: {
        ...devices['iPad (gen 7)'],
        baseURL: FRONTEND_URL,
      },
    },
  ],

  // webServer config disabled when testing against deployed instance
  // Uncomment when running against local dev servers:
  // webServer: [
  //   {
  //     command: 'cd ../backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000',
  //     url: 'http://localhost:8000/api/health',
  //     reuseExistingServer: !process.env.CI,
  //     timeout: 30000,
  //     env: {
  //       DATABASE_PATH: path.resolve(__dirname, '../backend/data/test.db'),
  //     },
  //   },
  //   {
  //     command: 'cd ../frontend && npm run dev',
  //     url: 'http://localhost:5173',
  //     reuseExistingServer: !process.env.CI,
  //     timeout: 30000,
  //     env: {
  //       VITE_API_URL: 'http://localhost:8000/api',
  //     },
  //   },
  // ],
});
