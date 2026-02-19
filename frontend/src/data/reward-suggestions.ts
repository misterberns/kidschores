export interface RewardSuggestion {
  name: string;
  icon: string;
  cost: number;
  requiresApproval: boolean;
}

export const REWARD_SUGGESTIONS: RewardSuggestion[] = [
  { name: 'Extra Screen Time', icon: '📱', cost: 50, requiresApproval: true },
  { name: 'Pick Dinner', icon: '🍕', cost: 50, requiresApproval: false },
  { name: 'Trip to Park', icon: '🌳', cost: 60, requiresApproval: true },
  { name: 'Ice Cream', icon: '🍦', cost: 75, requiresApproval: false },
  { name: 'Stay Up Late', icon: '🌙', cost: 75, requiresApproval: true },
  { name: 'Movie Night', icon: '🎬', cost: 100, requiresApproval: true },
  { name: 'Video Game Time', icon: '🎮', cost: 50, requiresApproval: true },
  { name: 'New Toy', icon: '🧸', cost: 200, requiresApproval: true },
];
