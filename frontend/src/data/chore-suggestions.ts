export interface ChoreSuggestion {
  name: string;
  icon: string;
  points: number;
  frequency: string;
  shared?: boolean;
}

export const CHORE_SUGGESTIONS: Record<string, ChoreSuggestion[]> = {
  Bedroom: [
    { name: 'Clean Room', icon: 'brush', points: 25, frequency: 'daily' },
    { name: 'Make Bed', icon: 'bed', points: 10, frequency: 'daily' },
  ],
  Kitchen: [
    { name: 'Wash Dishes', icon: 'sparkles', points: 20, frequency: 'daily', shared: true },
    { name: 'Set Table', icon: 'utensils', points: 10, frequency: 'daily' },
    { name: 'Clear Table', icon: 'utensils', points: 10, frequency: 'daily' },
  ],
  Bathroom: [
    { name: 'Brush Teeth', icon: 'brush', points: 5, frequency: 'daily' },
    { name: 'Clean Bathroom', icon: 'shower-head', points: 30, frequency: 'weekly' },
  ],
  'Living Room': [
    { name: 'Vacuum Floor', icon: 'brush', points: 20, frequency: 'weekly' },
    { name: 'Tidy Living Room', icon: 'sofa', points: 15, frequency: 'daily' },
  ],
  Outdoor: [
    { name: 'Take Out Trash', icon: 'trash-2', points: 15, frequency: 'daily', shared: true },
    { name: 'Water Plants', icon: 'sprout', points: 10, frequency: 'daily' },
  ],
  School: [
    { name: 'Do Homework', icon: 'book-open', points: 30, frequency: 'daily' },
    { name: 'Read Book', icon: 'book', points: 20, frequency: 'daily' },
  ],
  'Pet Care': [
    { name: 'Feed Cats', icon: 'cat', points: 15, frequency: 'daily' },
    { name: 'Clean Litter Box', icon: 'cat', points: 20, frequency: 'daily' },
    { name: 'Brush Cats', icon: 'cat', points: 15, frequency: 'weekly' },
  ],
  Laundry: [
    { name: 'Put Away Laundry', icon: 'shirt', points: 15, frequency: 'weekly' },
    { name: 'Sort Laundry', icon: 'washing-machine', points: 10, frequency: 'weekly' },
  ],
};
