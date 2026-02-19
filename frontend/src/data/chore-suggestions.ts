export interface ChoreSuggestion {
  name: string;
  icon: string;
  points: number;
  frequency: string;
  shared?: boolean;
}

export const CHORE_SUGGESTIONS: Record<string, ChoreSuggestion[]> = {
  Bedroom: [
    { name: 'Clean Room', icon: '🧹', points: 25, frequency: 'daily' },
    { name: 'Make Bed', icon: '🛏️', points: 10, frequency: 'daily' },
  ],
  Kitchen: [
    { name: 'Wash Dishes', icon: '🧽', points: 20, frequency: 'daily', shared: true },
    { name: 'Set Table', icon: '🍽️', points: 10, frequency: 'daily' },
    { name: 'Clear Table', icon: '🍽️', points: 10, frequency: 'daily' },
  ],
  Bathroom: [
    { name: 'Brush Teeth', icon: '🪥', points: 5, frequency: 'daily' },
    { name: 'Clean Bathroom', icon: '🚿', points: 30, frequency: 'weekly' },
  ],
  'Living Room': [
    { name: 'Vacuum Floor', icon: '🧹', points: 20, frequency: 'weekly' },
    { name: 'Tidy Living Room', icon: '🛋️', points: 15, frequency: 'daily' },
  ],
  Outdoor: [
    { name: 'Take Out Trash', icon: '🗑️', points: 15, frequency: 'daily', shared: true },
    { name: 'Water Plants', icon: '🌱', points: 10, frequency: 'daily' },
  ],
  School: [
    { name: 'Do Homework', icon: '📚', points: 30, frequency: 'daily' },
    { name: 'Read Book', icon: '📖', points: 20, frequency: 'daily' },
  ],
  'Pet Care': [
    { name: 'Feed Cats', icon: '🐱', points: 15, frequency: 'daily' },
    { name: 'Clean Litter Box', icon: '🐱', points: 20, frequency: 'daily' },
    { name: 'Brush Cats', icon: '🐱', points: 15, frequency: 'weekly' },
  ],
  Laundry: [
    { name: 'Put Away Laundry', icon: '👕', points: 15, frequency: 'weekly' },
    { name: 'Sort Laundry', icon: '🧺', points: 10, frequency: 'weekly' },
  ],
};
