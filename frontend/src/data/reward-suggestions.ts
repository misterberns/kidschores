export interface RewardSuggestion {
  name: string;
  icon: string;
  cost: number;
  requiresApproval: boolean;
}

export const REWARD_SUGGESTIONS: RewardSuggestion[] = [
  { name: 'Extra Screen Time', icon: 'smartphone', cost: 50, requiresApproval: true },
  { name: 'Pick Dinner', icon: 'pizza', cost: 50, requiresApproval: false },
  { name: 'Trip to Park', icon: 'trees', cost: 60, requiresApproval: true },
  { name: 'Ice Cream', icon: 'ice-cream-cone', cost: 75, requiresApproval: false },
  { name: 'Stay Up Late', icon: 'moon', cost: 75, requiresApproval: true },
  { name: 'Movie Night', icon: 'clapperboard', cost: 100, requiresApproval: true },
  { name: 'Video Game Time', icon: 'gamepad-2', cost: 50, requiresApproval: true },
  { name: 'New Toy', icon: 'toy-brick', cost: 200, requiresApproval: true },
];
