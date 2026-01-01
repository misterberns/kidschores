import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface Kid {
  id: string;
  name: string;
  points: number;
  points_multiplier: number;
  overall_chore_streak: number;
  completed_chores_today: number;
  completed_chores_weekly: number;
  completed_chores_monthly: number;
  completed_chores_total: number;
  badges: string[];
  enable_notifications: boolean;
  created_at: string;
}

export interface Chore {
  id: string;
  name: string;
  description?: string;
  icon: string;
  default_points: number;
  assigned_kids: string[];
  shared_chore: boolean;
  recurring_frequency: string;
  due_date?: string;
  allow_multiple_claims_per_day: boolean;
  status?: string;
  claimed_by?: string;
}

export interface Reward {
  id: string;
  name: string;
  description?: string;
  icon: string;
  cost: number;
  eligible_kids: string[];
  requires_approval: boolean;
}

export interface PendingApprovals {
  chores: any[];
  rewards: any[];
}

// API Functions
export const kidsApi = {
  list: () => api.get<Kid[]>('/kids'),
  get: (id: string) => api.get<Kid>(`/kids/${id}`),
  create: (data: Partial<Kid>) => api.post<Kid>('/kids', data),
  update: (id: string, data: Partial<Kid>) => api.put<Kid>(`/kids/${id}`, data),
  delete: (id: string) => api.delete(`/kids/${id}`),
  adjustPoints: (id: string, points: number) =>
    api.post<Kid>(`/kids/${id}/points`, { points }),
};

export const choresApi = {
  list: () => api.get<Chore[]>('/chores'),
  get: (id: string) => api.get<Chore>(`/chores/${id}`),
  create: (data: Partial<Chore>) => api.post<Chore>('/chores', data),
  forKid: (kidId: string) => api.get<Chore[]>(`/chores/kid/${kidId}`),
  claim: (choreId: string, kidId: string) =>
    api.post(`/chores/${choreId}/claim`, { kid_id: kidId }),
  approve: (choreId: string, parentName: string, points?: number) =>
    api.post(`/chores/${choreId}/approve`, { parent_name: parentName, points_awarded: points }),
  disapprove: (choreId: string, parentName: string) =>
    api.post(`/chores/${choreId}/disapprove`, { parent_name: parentName }),
};

export const rewardsApi = {
  list: () => api.get<Reward[]>('/rewards'),
  get: (id: string) => api.get<Reward>(`/rewards/${id}`),
  create: (data: Partial<Reward>) => api.post<Reward>('/rewards', data),
  redeem: (rewardId: string, kidId: string) =>
    api.post(`/rewards/${rewardId}/redeem`, { kid_id: kidId }),
  approve: (rewardId: string, parentName: string) =>
    api.post(`/rewards/${rewardId}/approve`, { parent_name: parentName }),
};

export const approvalsApi = {
  pending: () => api.get<PendingApprovals>('/approvals/pending'),
  count: () => api.get<{ total: number }>('/approvals/pending/count'),
  history: (limit = 50) => api.get(`/approvals/history?limit=${limit}`),
};
