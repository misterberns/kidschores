import { faker } from '@faker-js/faker';

/**
 * Test data factories for generating realistic test data
 */
export const TestData = {
  /**
   * Generate kid data
   */
  kid: {
    create: (overrides: Partial<KidInput> = {}): KidInput => ({
      name: faker.person.firstName(),
      enable_notifications: true,
      ...overrides,
    }),

    /** Common test kids */
    emma: (): KidInput => ({ name: 'Emma', enable_notifications: true }),
    jack: (): KidInput => ({ name: 'Jack', enable_notifications: true }),
    sophia: (): KidInput => ({ name: 'Sophia', enable_notifications: false }),
  },

  /**
   * Generate chore data
   */
  chore: {
    create: (assignedKids: string[] = [], overrides: Partial<ChoreInput> = {}): ChoreInput => ({
      name: faker.helpers.arrayElement([
        'Clean Room',
        'Make Bed',
        'Do Homework',
        'Feed Pet',
        'Set Table',
        'Take Out Trash',
        'Brush Teeth',
        'Read Book',
        'Wash Dishes',
        'Vacuum Floor',
      ]),
      description: faker.lorem.sentence(),
      icon: faker.helpers.arrayElement(['🧹', '🛏️', '📚', '🐕', '🍽️', '🗑️', '🪥', '📖', '🧽', '🧺']),
      default_points: faker.number.int({ min: 5, max: 50 }),
      assigned_kids: assignedKids,
      shared_chore: false,
      recurring_frequency: 'none',
      allow_multiple_claims_per_day: false,
      ...overrides,
    }),

    /** Common test chores */
    cleanRoom: (assignedKids: string[]): ChoreInput => ({
      name: 'Clean Room',
      description: 'Tidy up your bedroom',
      icon: '🧹',
      default_points: 25,
      assigned_kids: assignedKids,
      shared_chore: false,
      recurring_frequency: 'daily',
      allow_multiple_claims_per_day: false,
    }),

    doHomework: (assignedKids: string[]): ChoreInput => ({
      name: 'Do Homework',
      description: 'Complete all homework assignments',
      icon: '📚',
      default_points: 30,
      assigned_kids: assignedKids,
      shared_chore: false,
      recurring_frequency: 'daily',
      allow_multiple_claims_per_day: false,
    }),
  },

  /**
   * Generate category data
   */
  category: {
    create: (overrides: Partial<CategoryInput> = {}): CategoryInput => ({
      name: faker.helpers.arrayElement([
        'Bedroom',
        'Kitchen',
        'Bathroom',
        'Living Room',
        'Outdoor',
        'School',
        'Pet Care',
      ]),
      icon: faker.helpers.arrayElement(['🛏️', '🍳', '🚿', '🛋️', '🌳', '📚', '🐕']),
      color: faker.helpers.arrayElement([
        '#4f46e5',
        '#ef4444',
        '#3b82f6',
        '#22c55e',
        '#f59e0b',
        '#8b5cf6',
        '#ec4899',
      ]),
      sort_order: faker.number.int({ min: 1, max: 10 }),
      ...overrides,
    }),

    /** Common test categories */
    bedroom: (): CategoryInput => ({ name: 'Bedroom', icon: '🛏️', color: '#4f46e5', sort_order: 1 }),
    kitchen: (): CategoryInput => ({ name: 'Kitchen', icon: '🍳', color: '#ef4444', sort_order: 2 }),
    bathroom: (): CategoryInput => ({ name: 'Bathroom', icon: '🚿', color: '#3b82f6', sort_order: 3 }),
    outdoor: (): CategoryInput => ({ name: 'Outdoor', icon: '🌳', color: '#22c55e', sort_order: 4 }),
  },

  /**
   * Generate reward data
   */
  reward: {
    create: (overrides: Partial<RewardInput> = {}): RewardInput => ({
      name: faker.helpers.arrayElement([
        'Extra Screen Time',
        'Ice Cream',
        'New Toy',
        'Movie Night',
        'Stay Up Late',
        'Pick Dinner',
        'Trip to Park',
        'Video Game Time',
      ]),
      description: faker.lorem.sentence(),
      icon: faker.helpers.arrayElement(['📱', '🍦', '🧸', '🎬', '🌙', '🍕', '🌳', '🎮']),
      cost: faker.number.int({ min: 25, max: 200 }),
      eligible_kids: [],
      requires_approval: true,
      ...overrides,
    }),

    /** Common test rewards */
    screenTime: (cost = 50): RewardInput => ({
      name: 'Extra Screen Time',
      description: '30 minutes of extra screen time',
      icon: '📱',
      cost,
      eligible_kids: [],
      requires_approval: true,
    }),

    iceCream: (cost = 75): RewardInput => ({
      name: 'Ice Cream',
      description: 'Choose your favorite ice cream',
      icon: '🍦',
      cost,
      eligible_kids: [],
      requires_approval: false,
    }),
  },

  /**
   * Generate parent data
   */
  parent: {
    create: (associatedKids: string[] = [], overrides: Partial<ParentInput> = {}): ParentInput => ({
      name: faker.helpers.arrayElement(['Mom', 'Dad', 'Grandma', 'Grandpa']),
      pin: faker.string.numeric(4),
      associated_kids: associatedKids,
      enable_notifications: true,
      ...overrides,
    }),

    /** Common test parents */
    mom: (associatedKids: string[] = []): ParentInput => ({
      name: 'Mom',
      pin: '1234',
      associated_kids: associatedKids,
      enable_notifications: true,
    }),

    dad: (associatedKids: string[] = []): ParentInput => ({
      name: 'Dad',
      pin: '5678',
      associated_kids: associatedKids,
      enable_notifications: true,
    }),
  },
};

// Type definitions for test data
export interface KidInput {
  name: string;
  enable_notifications?: boolean;
}

export interface ChoreInput {
  name: string;
  description?: string;
  icon?: string;
  default_points: number;
  assigned_kids: string[];
  shared_chore?: boolean;
  recurring_frequency?: string;
  custom_interval?: number;
  custom_interval_unit?: string;
  applicable_days?: number[];
  due_date?: string;
  allow_multiple_claims_per_day?: boolean;
  partial_allowed?: boolean;
  category_id?: string;
}

export interface CategoryInput {
  name: string;
  icon: string;
  color: string;
  sort_order?: number;
}

export interface Category extends CategoryInput {
  id: string;
  chore_count?: number;
}

export interface RewardInput {
  name: string;
  description?: string;
  icon?: string;
  cost: number;
  eligible_kids?: string[];
  requires_approval?: boolean;
}

export interface ParentInput {
  name: string;
  pin?: string;
  associated_kids?: string[];
  enable_notifications?: boolean;
}

// Response types (what the API returns)
export interface Kid extends KidInput {
  id: string;
  points: number;
  points_multiplier: number;
  overall_chore_streak: number;
  completed_chores_today: number;
  completed_chores_weekly: number;
  completed_chores_monthly: number;
  completed_chores_total: number;
  badges: string[];
  created_at: string;
}

export interface Chore extends ChoreInput {
  id: string;
  status?: string;
  claimed_by?: string;
}

export interface Reward extends RewardInput {
  id: string;
}

export interface Parent extends ParentInput {
  id: string;
  created_at: string;
}
