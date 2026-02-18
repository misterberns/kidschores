import axios from 'axios';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Global error interceptor — auto-toast for network/server errors
// 401 is NOT toasted here (AuthContext handles token refresh)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      toast.error('Connection error', {
        description: 'Could not reach the server. Check your connection.',
      });
    } else if (error.response.status === 403) {
      toast.error('Access denied', {
        description: "You don't have permission for this action.",
      });
    } else if (error.response.status >= 500) {
      toast.error('Server error', {
        description: 'Something went wrong. Please try again.',
      });
    }
    return Promise.reject(error);
  }
);

// Types
export interface Kid {
  id: string;
  name: string;
  points: number;
  points_multiplier: number;
  overall_chore_streak: number;
  longest_streak_ever: number;
  streak_freeze_count: number;
  completed_chores_today: number;
  completed_chores_weekly: number;
  completed_chores_monthly: number;
  completed_chores_total: number;
  badges: string[];
  enable_notifications: boolean;
  google_email?: string;
  created_at: string;
}

export interface StreakInfo {
  overall_streak: number;
  longest_streak_ever: number;
  streak_freeze_count: number;
  chore_streaks: Record<string, number>;
  is_streak_at_risk: boolean;
  next_milestone?: number;
  days_to_next_milestone?: number;
}

export interface DailyProgress {
  kid_id: string;
  date: string;
  total_chores: number;
  completed_chores: number;
  completion_percentage: number;
  all_completed: boolean;
  bonus_eligible: boolean;
  bonus_awarded: boolean;
  bonus_points: number;
  multiplier: number;
}

export interface TodaysChore extends Chore {
  streak_count: number;
  is_recurring: boolean;
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
  custom_interval?: number;
  custom_interval_unit?: string;
  applicable_days?: number[];
  due_date?: string;
  allow_multiple_claims_per_day: boolean;
  partial_allowed?: boolean;
  status?: string;
  claimed_by?: string;
  category_id?: string;
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

export interface PendingChoreClaim {
  id: string;
  kid_id: string;
  chore_id: string;
  status: string;
  points_awarded: number | null;
  claimed_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

export interface PendingRewardClaim {
  id: string;
  kid_id: string;
  reward_id: string;
  status: string;
  points_spent: number | null;
  requested_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

export interface PendingApprovals {
  chores: PendingChoreClaim[];
  rewards: PendingRewardClaim[];
}

export interface Parent {
  id: string;
  name: string;
  pin?: string;
  associated_kids: string[];
  enable_notifications: boolean;
  created_at: string;
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
  getStreaks: (id: string) => api.get<StreakInfo>(`/kids/${id}/streaks`),
  getDailyProgress: (id: string) => api.get<DailyProgress>(`/kids/${id}/daily-progress`),
  useStreakFreeze: (id: string) => api.post<Kid>(`/kids/${id}/streak-freeze`),
  linkGoogle: (id: string, email: string) =>
    api.put(`/kids/${id}/link-google`, { email }),
  unlinkGoogle: (id: string) =>
    api.delete(`/kids/${id}/link-google`),
};

export const choresApi = {
  list: () => api.get<Chore[]>('/chores'),
  get: (id: string) => api.get<Chore>(`/chores/${id}`),
  create: (data: Partial<Chore>) => api.post<Chore>('/chores', data),
  update: (id: string, data: Partial<Chore>) => api.put<Chore>(`/chores/${id}`, data),
  delete: (id: string) => api.delete(`/chores/${id}`),
  forKid: (kidId: string) => api.get<Chore[]>(`/chores/kid/${kidId}`),
  todayForKid: (kidId: string) => api.get<TodaysChore[]>(`/chores/today/${kidId}`),
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
  update: (id: string, data: Partial<Reward>) => api.put<Reward>(`/rewards/${id}`, data),
  delete: (id: string) => api.delete(`/rewards/${id}`),
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

export const parentsApi = {
  list: () => api.get<Parent[]>('/parents'),
  get: (id: string) => api.get<Parent>(`/parents/${id}`),
  create: (data: Partial<Parent> & { email?: string; send_invite?: boolean }) =>
    api.post<Parent>('/parents', data),
  update: (id: string, data: Partial<Parent>) => api.put<Parent>(`/parents/${id}`, data),
  delete: (id: string) => api.delete(`/parents/${id}`),
  verifyPin: (id: string, pin: string) => api.post(`/parents/${id}/verify-pin`, { pin }),
  invite: (parentId: string, email: string) =>
    api.post(`/parents/${parentId}/invite`, { email }),
};

// Notification types
export interface NotificationPreferences {
  email_chore_claimed: boolean;
  email_chore_approved: boolean;
  email_daily_summary: boolean;
  push_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  kid_id?: string;
}

// Category types
export interface ChoreCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  chore_count?: number;
}

export const categoriesApi = {
  list: () => api.get<ChoreCategory[]>('/categories'),
  get: (id: string) => api.get<ChoreCategory>(`/categories/${id}`),
  create: (data: Partial<ChoreCategory>) => api.post<ChoreCategory>('/categories', data),
  update: (id: string, data: Partial<ChoreCategory>) =>
    api.put<ChoreCategory>(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
  getPredefined: () => api.get<Partial<ChoreCategory>[]>('/categories/predefined'),
  seedDefaults: () => api.post('/categories/seed-defaults'),
  reorder: (id: string, newOrder: number) =>
    api.put(`/categories/${id}/reorder`, null, { params: { new_order: newOrder } }),
};

export const notificationsApi = {
  getVapidKey: () => api.get<{ public_key: string }>('/notifications/vapid-key'),
  subscribe: (subscription: PushSubscription) =>
    api.post('/notifications/subscribe', subscription),
  unsubscribe: (endpoint: string) =>
    api.delete('/notifications/unsubscribe', { params: { endpoint } }),
  sendTest: (endpoint: string) =>
    api.post('/notifications/test', null, { params: { endpoint } }),
  getPreferences: (userId: string) =>
    api.get<NotificationPreferences>(`/notifications/preferences/${userId}`),
  updatePreferences: (userId: string, prefs: Partial<NotificationPreferences>) =>
    api.put<NotificationPreferences>(`/notifications/preferences/${userId}`, prefs),
};

// Allowance types
export interface AllowanceSettings {
  id: string;
  kid_id: string;
  points_per_dollar: number;
  auto_payout: boolean;
  payout_day: number; // 0=Sunday, 6=Saturday
  minimum_payout: number;
  kid_points: number;
  dollar_equivalent: number;
}

export interface AllowancePayout {
  id: string;
  kid_id: string;
  points_converted: number;
  dollar_amount: number;
  payout_method: string;
  status: 'pending' | 'paid' | 'cancelled';
  notes?: string;
  requested_at: string;
  paid_at?: string;
  paid_by?: string;
}

export interface AllowanceSummary {
  kid_id: string;
  kid_name: string;
  current_points: number;
  dollar_equivalent: number;
  points_per_dollar: number;
  pending_payouts: number;
  pending_amount: number;
  total_paid: number;
  total_paid_count: number;
}

export const allowanceApi = {
  getSettings: (kidId: string) =>
    api.get<AllowanceSettings>(`/allowance/settings/${kidId}`),
  updateSettings: (kidId: string, data: Partial<AllowanceSettings>) =>
    api.put<AllowanceSettings>(`/allowance/settings/${kidId}`, data),
  requestPayout: (kidId: string, data: { points_to_convert: number; payout_method?: string; notes?: string }) =>
    api.post<AllowancePayout>(`/allowance/convert/${kidId}`, data),
  getPayouts: (kidId: string, status?: string) =>
    api.get<AllowancePayout[]>(`/allowance/payouts/${kidId}`, { params: status ? { status } : {} }),
  getAllPending: () =>
    api.get<AllowancePayout[]>('/allowance/pending'),
  markPaid: (payoutId: string, data: { paid_by: string; notes?: string }) =>
    api.post<AllowancePayout>(`/allowance/payouts/${payoutId}/pay`, data),
  cancelPayout: (payoutId: string) =>
    api.post<AllowancePayout>(`/allowance/payouts/${payoutId}/cancel`),
  getSummary: (kidId: string) =>
    api.get<AllowanceSummary>(`/allowance/summary/${kidId}`),
};

// History types
export interface HistoryItem {
  id: string;
  chore_id: string;
  chore_name: string;
  chore_icon: string;
  category_name?: string;
  category_color?: string;
  status: string;
  points_awarded?: number;
  claimed_at: string;
  approved_at?: string;
  approved_by?: string;
  notes?: string;
}

export interface HistoryResponse {
  items: HistoryItem[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface DailyStats {
  date: string;
  completed: number;
  total_points: number;
}

export interface CategoryStats {
  category_id?: string;
  category_name: string;
  category_color: string;
  count: number;
  points: number;
}

export interface Analytics {
  kid_id: string;
  kid_name: string;
  total_chores_completed: number;
  total_points_earned: number;
  average_points_per_chore: number;
  chores_today: number;
  chores_this_week: number;
  chores_this_month: number;
  points_today: number;
  points_this_week: number;
  points_this_month: number;
  current_streak: number;
  longest_streak: number;
  daily_stats: DailyStats[];
  category_stats: CategoryStats[];
  top_chores: Array<{ chore_id: string; chore_name: string; chore_icon: string; count: number; points: number }>;
}

export const historyApi = {
  getHistory: (kidId: string, params?: { page?: number; per_page?: number; status?: string; category_id?: string }) =>
    api.get<HistoryResponse>(`/history/${kidId}`, { params }),
  getAnalytics: (kidId: string, days?: number) =>
    api.get<Analytics>(`/history/stats/${kidId}`, { params: days ? { days } : {} }),
  exportCsv: (kidId: string) =>
    api.get(`/history/export/${kidId}`, { responseType: 'blob' }),
};
