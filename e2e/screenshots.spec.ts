/**
 * Screenshot capture for README documentation.
 *
 * Seeds realistic test data, captures key pages in light/dark mode,
 * and saves to screenshots/ directory for README embedding.
 *
 * Usage:
 *   API_URL=http://localhost:3103 npx playwright test e2e/screenshots.spec.ts --project=chromium
 *
 * Against deployed instance:
 *   API_URL=https://your-instance npx playwright test e2e/screenshots.spec.ts --project=chromium
 */
import { test, expect } from './fixtures/test-database';
import { ApiHelpers } from './fixtures/api-helpers';
import * as path from 'path';

const SCREENSHOT_DIR = path.resolve(__dirname, '../screenshots');

// Seed data for realistic screenshots
async function seedData(api: ApiHelpers) {
  // Create kids
  const emma = await api.createKid({ name: 'Emma', enable_notifications: true });
  const jack = await api.createKid({ name: 'Jack', enable_notifications: true });
  const sophia = await api.createKid({ name: 'Sophia', enable_notifications: false });

  // Give kids some points
  await api.adjustKidPoints(emma.id, 185, 'Accumulated from chores');
  await api.adjustKidPoints(jack.id, 120, 'Accumulated from chores');
  await api.adjustKidPoints(sophia.id, 75, 'Accumulated from chores');

  // Create categories
  const bedroom = await api.createCategory({ name: 'Bedroom', icon: '\u{1F6CF}\uFE0F', color: '#4f46e5', sort_order: 1 });
  const kitchen = await api.createCategory({ name: 'Kitchen', icon: '\u{1F373}', color: '#ef4444', sort_order: 2 });
  const school = await api.createCategory({ name: 'School', icon: '\u{1F4DA}', color: '#3b82f6', sort_order: 3 });
  const outdoor = await api.createCategory({ name: 'Outdoor', icon: '\u{1F333}', color: '#22c55e', sort_order: 4 });

  // Create chores across categories
  const allKids = [emma.id, jack.id, sophia.id];
  const cleanRoom = await api.createChore({
    name: 'Clean Room', description: 'Tidy up your bedroom',
    icon: '\u{1F9F9}', default_points: 25, assigned_kids: allKids,
    shared_chore: false, recurring_frequency: 'daily', category_id: bedroom.id,
  });
  const makeBed = await api.createChore({
    name: 'Make Bed', description: 'Make your bed neatly',
    icon: '\u{1F6CF}\uFE0F', default_points: 10, assigned_kids: allKids,
    shared_chore: false, recurring_frequency: 'daily', category_id: bedroom.id,
  });
  const doHomework = await api.createChore({
    name: 'Do Homework', description: 'Complete all assignments',
    icon: '\u{1F4DA}', default_points: 30, assigned_kids: [emma.id, jack.id],
    shared_chore: false, recurring_frequency: 'daily', category_id: school.id,
  });
  const washDishes = await api.createChore({
    name: 'Wash Dishes', description: 'Clean all dishes after dinner',
    icon: '\u{1F9FD}', default_points: 20, assigned_kids: allKids,
    shared_chore: true, recurring_frequency: 'daily', category_id: kitchen.id,
  });
  const waterPlants = await api.createChore({
    name: 'Water Plants', description: 'Water the garden plants',
    icon: '\u{1F331}', default_points: 15, assigned_kids: [sophia.id],
    shared_chore: false, recurring_frequency: 'weekly', category_id: outdoor.id,
  });
  const takeOutTrash = await api.createChore({
    name: 'Take Out Trash', description: 'Bring trash cans to curb',
    icon: '\u{1F5D1}\uFE0F', default_points: 15, assigned_kids: [jack.id, emma.id],
    shared_chore: false, recurring_frequency: 'weekly', category_id: outdoor.id,
  });

  // Create some claims for approval queue
  await api.claimChore(cleanRoom.id, emma.id);
  await api.claimChore(doHomework.id, jack.id);
  await api.claimChore(washDishes.id, sophia.id);

  // Create rewards
  await api.createReward({
    name: 'Extra Screen Time', description: '30 minutes of extra screen time',
    icon: '\u{1F4F1}', cost: 50, eligible_kids: [], requires_approval: true,
  });
  await api.createReward({
    name: 'Ice Cream', description: 'Choose your favorite ice cream',
    icon: '\u{1F366}', cost: 75, eligible_kids: [], requires_approval: false,
  });
  await api.createReward({
    name: 'Movie Night', description: 'Pick a movie for family movie night',
    icon: '\u{1F3AC}', cost: 100, eligible_kids: [], requires_approval: true,
  });
  await api.createReward({
    name: 'New Toy', description: 'Pick a small toy (up to $10)',
    icon: '\u{1F9F8}', cost: 200, eligible_kids: [], requires_approval: true,
  });

  // Create parent
  await api.createParent({ name: 'Mom', pin: '1234', associated_kids: allKids, enable_notifications: true });

  return { emma, jack, sophia };
}

test.describe('README Screenshots', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('capture all screenshots', async ({ authenticatedPage: page, authApiContext }) => {
    const api = new ApiHelpers(authApiContext);

    // Reset and seed data
    await seedData(api);

    // Wait for data to be available
    await page.waitForTimeout(500);

    // --- Home Dashboard (Light) ---
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Let animations settle
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'home-light.png') });

    // --- Home Dashboard (Dark) ---
    await page.evaluate(() => {
      localStorage.setItem('kidschores-theme-mode', 'dark');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'home-dark.png') });

    // --- Chores (Light) ---
    await page.evaluate(() => {
      localStorage.setItem('kidschores-theme-mode', 'light');
    });
    await page.goto('/chores');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'chores-light.png') });

    // --- Chores (Dark) ---
    await page.evaluate(() => {
      localStorage.setItem('kidschores-theme-mode', 'dark');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'chores-dark.png') });

    // --- Rewards (Light) ---
    await page.evaluate(() => {
      localStorage.setItem('kidschores-theme-mode', 'light');
    });
    await page.goto('/rewards');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'rewards-light.png') });

    // --- Rewards (Dark) ---
    await page.evaluate(() => {
      localStorage.setItem('kidschores-theme-mode', 'dark');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'rewards-dark.png') });

    // --- Allowance (Light) ---
    await page.evaluate(() => {
      localStorage.setItem('kidschores-theme-mode', 'light');
    });
    await page.goto('/allowance');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'allowance-light.png') });

    // --- Allowance (Dark) ---
    await page.evaluate(() => {
      localStorage.setItem('kidschores-theme-mode', 'dark');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'allowance-dark.png') });

    // --- Admin / Approvals (Light) ---
    await page.evaluate(() => {
      localStorage.setItem('kidschores-theme-mode', 'light');
    });
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin-light.png') });

    // --- Admin / Approvals (Dark) ---
    await page.evaluate(() => {
      localStorage.setItem('kidschores-theme-mode', 'dark');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin-dark.png') });

    // --- History (Light) ---
    await page.evaluate(() => {
      localStorage.setItem('kidschores-theme-mode', 'light');
    });
    await page.goto('/history');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'history-light.png') });

    // --- History (Dark) ---
    await page.evaluate(() => {
      localStorage.setItem('kidschores-theme-mode', 'dark');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'history-dark.png') });
  });

  test('capture login screen', async ({ page }) => {
    // --- Login (Light — default) ---
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'login-light.png') });

    // --- Login (Dark) ---
    await page.evaluate(() => {
      localStorage.setItem('kidschores-theme-mode', 'dark');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'login-dark.png') });
  });
});
